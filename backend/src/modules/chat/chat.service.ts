import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Person } from "../../entities/Person";
import { ApiError } from "../../utils/ApiError";
import { TreeService } from "../trees/tree.service";
import { PersonService } from "../persons/person.service";
import { AiService } from "./ai.service";
import { S3Service } from "../storage/s3.service";
import { ChatMessageDto } from "./dto/chat.dto";
import {
  formatPersonName,
  resolvePersonByName,
  toPersonSummaries,
  isDestructiveCommand,
} from "./helpers/chat.helper";
import { parseAiDecision } from "./helpers/chat-decision.helper";
import {
  buildResultReply,
  executeChatActions,
  getLastAffectedPerson,
  summarizeChatAction,
} from "./helpers/chat-action.helper";
import { FamilyTreeImportService } from "./family-tree-import.service";
import { ChatActionResult, ChatResult, AiActionItem } from "./types/chat.types";
import {
  mapPersonToResponse,
  PersonResponse,
} from "../persons/helpers/person.mapper";
import { uploadChatImageToS3 } from "./helpers/chat-image.helper";
import { buildDeepSeekImageUserMessage } from "./helpers/chat-image-prompt.helper";
import { providerSupportsVision } from "./helpers/ai-vision.helper";
import { parseAiModalProvider } from "./helpers/ai-config.helper";
import { AiImageInput } from "./types/ai.types";
import {
  applyProfileImageUpdates,
  splitProfileImageActions,
} from "./helpers/chat-profile-image.helper";
import { buildSystemPrompt } from "./helpers/system-prompt.helper";

const MAX_IMAGE_BASE64_LENGTH = 8_000_000;

/** Fields the AI may include in a BULK_UPDATE_PERSONS action → DB column. */
const BULK_FIELD_MAP: Record<string, string> = {
  first_name: "firstName",
  last_name: "lastName",
  gender: "gender",
  birth_date: "birthDate",
  death_date: "deathDate",
  birth_place: "birthPlace",
  current_place: "currentPlace",
  health_note: "healthNote",
};

/** Simple yes/no confirmation phrases the user might type. */
const CONFIRMATION_PHRASES = /^(yes|confirm|continue|apply it|go ahead|sure|ok|okay|proceed|do it)$/i;

/** Simple cancel/reject phrases. */
const REJECTION_PHRASES = /^(no|cancel|abort|stop|never mind|nope)$/i;

interface PendingChatImage {
  data: string;
  content_type: string;
}

interface PendingBulkUpdate {
  updates: Record<string, string>;
  originalAiReply: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly pendingImages = new Map<string, PendingChatImage>();
  private readonly pendingBulkUpdates = new Map<string, PendingBulkUpdate>();

  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    private readonly treeService: TreeService,
    private readonly personService: PersonService,
    private readonly aiService: AiService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly familyTreeImportService: FamilyTreeImportService,
  ) {}

  async sendMessage(
    treeId: string,
    userId: string,
    dto: ChatMessageDto,
  ): Promise<ChatResult> {
    this.validateChatImage(dto);

    const { tree, permission } = await this.treeService.getAccessibleTree(
      treeId,
      userId,
    );

    if (permission === 'VIEW') {
      throw new ApiError(
        403,
        'You have read-only access to this tree. Chat actions are not available.',
      );
    }

    const persons = await this.personRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    });

    const importResult = await this.familyTreeImportService.tryImport(
      treeId,
      userId,
      persons,
      dto.message,
    );
    if (importResult) {
      this.clearPendingState(treeId, userId);
      return importResult;
    }

    // Pre-check: intercept clear destructive commands before calling AI
    if (isDestructiveCommand(dto.message)) {
      return {
        reply:
          "I can help you add people, edit their details, and answer questions about the family tree, but deleting or removing people is not supported through the AI assistant. Please use the tree interface to delete the person manually.",
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    const directLookup = this.handleDirectPersonLookup(persons, dto.message);
    if (directLookup) {
      return directLookup;
    }

    const cacheKey = this.pendingKey(treeId, userId);
    const hasIncomingImage = Boolean(dto.image);

    if (
      persons.length === 0 &&
      (hasIncomingImage ||
        this.pendingImages.has(cacheKey) ||
        this.isProfileImageRequest(dto.message))
    ) {
      this.pendingImages.delete(cacheKey);
      return {
        reply:
          "There are no people in this family tree right now, so I can't set a profile photo. Please add the first person, then upload the photo again.",
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    // ── Handle pending bulk-update confirmation / rejection ──────────────
    let pendingBulk = this.pendingBulkUpdates.get(cacheKey);

    // If the user sends an unrelated message (not confirm/reject) while
    // pending state exists, treat it as a new independent intent.
    if (pendingBulk && this.isIndependentQuery(dto.message)) {
      this.logger.log(`Clearing pending bulk update due to new independent query`);
      this.clearPendingState(treeId, userId);
      pendingBulk = undefined;
    }

    // Clear stale pending image when user sends a non-image query
    if (!hasIncomingImage && this.pendingImages.has(cacheKey)) {
      this.logger.log(`Clearing stale pending image for new non-image query`);
      this.pendingImages.delete(cacheKey);
    }

    if (pendingBulk) {
      const trimmedMsg = dto.message.trim();

      if (CONFIRMATION_PHRASES.test(trimmedMsg)) {
        const result = await this.executeBulkUpdate(
          treeId,
          pendingBulk.updates,
        );
        this.pendingBulkUpdates.delete(cacheKey);
        return {
          reply: `Updated the ${this.bulkFieldLabel(pendingBulk.updates)} of ${result.updatedCount} people to "${this.bulkValueLabel(pendingBulk.updates)}".`,
          action: "BULK_UPDATE_PERSONS",
          person: null,
          focus_person: null,
          results: [result],
        };
      }

      if (REJECTION_PHRASES.test(trimmedMsg)) {
        this.pendingBulkUpdates.delete(cacheKey);
        return {
          reply: "Bulk update cancelled.",
          action: "NONE",
          person: null,
          focus_person: null,
          results: [],
        };
      }

      // User typed something else — ask again
      return {
        reply: pendingBulk.originalAiReply,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    const imageUrl = dto.image
      ? await uploadChatImageToS3(this.s3Service, treeId, userId, dto.image)
      : undefined;

    const aiProvider = parseAiModalProvider(
      this.configService.get<string>("AI_MODAL") ?? "",
      "AI_MODAL",
    );

    let userMessage = dto.message;
    let image: AiImageInput | undefined;

    if (imageUrl) {
      if (providerSupportsVision(aiProvider)) {
        image = { url: imageUrl, contentType: dto.image!.content_type };
      } else {
        userMessage = buildDeepSeekImageUserMessage(imageUrl, dto.message);
      }
    }

    this.logger.log(
      `Chat request — tree=${treeId}, hasImage=${hasIncomingImage}, ` +
      `message="${dto.message.substring(0, 100)}"`,
    );

    const aiResult = await this.aiService.callAi({
      systemPrompt: buildSystemPrompt(
        tree.name,
        toPersonSummaries(persons),
      ),
      userMessage,
      image,
      conversationHistory: dto.previousMessages ?? [],
    });

    this.logger.log(
      `AI raw response (first 300 chars): ${aiResult.raw.substring(0, 300)}`,
    );

    const decision = parseAiDecision(aiResult.raw);
    this.logger.log(
      `Chat decision — actions=${decision.actions.length}, ` +
      `reply="${decision.reply.substring(0, 150)}"`,
    );
    const focusPerson = this.resolveFocusPerson(
      persons,
      decision.focus_person_name,
    );

    // ── Extract bulk-update actions before profile-image splitting ────────
    const { bulkActions, regularActions } =
      this.splitBulkActions(decision.actions);

    const { profileImageRequests, actions } =
      splitProfileImageActions(regularActions);

    let results: ChatActionResult[] = [];

    if (persons.length === 0 && profileImageRequests.length > 0) {
      this.pendingImages.delete(cacheKey);
      return {
        reply:
          "There are no people in this family tree right now, so I can't set a profile photo. Please add the first person, then upload the photo again.",
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    // ── Handle first-time bulk update (count + store pending) ────────────
    if (bulkActions.length > 0) {
      const bulkItem = bulkActions[0];
      const updates = this.extractBulkUpdates(bulkItem);

      const count = await this.personRepo.count({
        where: { treeId, deletedAt: IsNull() },
      });

      if (count === 0) {
        return {
          reply: "There are no people in this family tree to update.",
          action: "NONE",
          person: null,
          focus_person: null,
          results: [],
        };
      }

      const confirmationReply = `This will change the ${this.bulkFieldLabel(updates)} of ${count} people to "${this.bulkValueLabel(updates)}". Do you want to continue?`;

      this.pendingBulkUpdates.set(cacheKey, {
        updates,
        originalAiReply: confirmationReply,
      });

      return {
        reply: confirmationReply,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    if (actions.length > 0) {
      const outcome = await executeChatActions(
        this.personRepo,
        this.personService,
        treeId,
        userId,
        persons,
        actions,
      );
      results = outcome.results;
    }

    const pendingImage = this.pendingImages.get(cacheKey);
    const effectiveImage = dto.image ?? pendingImage;

    if (profileImageRequests.length > 0 && effectiveImage) {
      const imageResults = await applyProfileImageUpdates(
        this.personService,
        persons,
        treeId,
        userId,
        effectiveImage,
        profileImageRequests,
      );
      results = [...results, ...imageResults];
    }

    if (results.length === 0) {
      if (hasIncomingImage) {
        this.pendingImages.set(cacheKey, {
          data: dto.image!.data,
          content_type: dto.image!.content_type,
        });
      }

      return {
        reply: decision.reply,
        action: "NONE",
        person: null,
        focus_person: focusPerson,
        results: [],
      };
    }

    this.pendingImages.delete(cacheKey);

    const action = summarizeChatAction(results);

    return {
      reply: buildResultReply(decision.reply, results),
      action: action === "NONE" ? "NONE" : action,
      person: getLastAffectedPerson(results),
      focus_person: focusPerson ?? getLastAffectedPerson(results),
      results,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private validateChatImage(dto: ChatMessageDto): void {
    if (!dto.image) return;

    this.s3Service.validateImageContentType(dto.image.content_type);

    if (dto.image.data.length > MAX_IMAGE_BASE64_LENGTH) {
      throw new ApiError(400, "Image is too large");
    }
  }

  private resolveFocusPerson(
    persons: Person[],
    focusPersonName: string | null,
  ): PersonResponse | null {
    if (!focusPersonName) return null;

    const resolved = resolvePersonByName(persons, focusPersonName);
    if (resolved.kind !== "found") return null;

    return mapPersonToResponse(resolved.person);
  }

  private handleDirectPersonLookup(
    persons: Person[],
    message: string,
  ): ChatResult | null {
    const lookupName = this.extractDirectPersonLookupName(message);
    if (!lookupName) return null;

    const resolved = resolvePersonByName(persons, lookupName);

    if (resolved.kind === "found") {
      const person = mapPersonToResponse(resolved.person);
      return {
        reply: this.buildPersonLookupReply(resolved.person, persons),
        action: "NONE",
        person: null,
        focus_person: person,
        results: [],
      };
    }

    if (resolved.kind === "ambiguous") {
      const options = resolved.matches.map((person) => {
        const gender = person.gender
          ? ` (${person.gender.toLowerCase()})`
          : "";
        return `${formatPersonName(person)}${gender}`;
      });

      return {
        reply: `I found multiple people matching "${lookupName}" in this tree. Please be more specific: ${options.join(", ")}.`,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    return {
      reply: `I couldn't find anyone named "${lookupName}" in this tree.`,
      action: "NONE",
      person: null,
      focus_person: null,
      results: [],
    };
  }

  private extractDirectPersonLookupName(message: string): string | null {
    const trimmed = message.trim().replace(/[?.!]+$/g, "").trim();
    const match = trimmed.match(
      /^(?:who\s+is|tell\s+me\s+about|describe|find|show\s+me)\s+(.+)$/i,
    );
    if (!match) return null;

    const name = match[1].trim().replace(/^person\s+/i, "").trim();
    if (!name || name.length > 80) return null;

    const nonPersonQueries = [
      "someone",
      "my family history",
      "family history",
      "my family tree",
      "family tree",
      "missing family details",
      "missing details",
    ];

    if (nonPersonQueries.includes(name.toLowerCase())) {
      return null;
    }

    return name;
  }

  private buildPersonLookupReply(person: Person, persons: Person[]): string {
    const fullName = formatPersonName(person);
    const gender = person.gender?.toLowerCase();
    const details: string[] = [];
    const parent = person.parentId
      ? persons.find((candidate) => candidate.id === person.parentId)
      : null;

    if (gender) {
      const article = /^[aeiou]/i.test(gender) ? "an" : "a";
      details.push(`${fullName} is ${article} ${gender} in this tree.`);
    } else {
      details.push(`${fullName} is in this tree.`);
    }

    if (parent) {
      details.push(`They are a child of ${formatPersonName(parent)}.`);
    } else if (person.isRoot) {
      details.push("They are the root person in this tree.");
    }

    if (person.birthDate) {
      details.push(`Birth date: ${person.birthDate}.`);
    }

    if (person.birthPlace) {
      details.push(`Birth place: ${person.birthPlace}.`);
    }

    if (person.currentPlace) {
      details.push(`Current place: ${person.currentPlace}.`);
    }

    if (person.healthNote) {
      details.push(`Health note: ${person.healthNote}.`);
    }

    return details.join(" ");
  }

  private pendingKey(treeId: string, userId: string): string {
    return `${treeId}:${userId}`;
  }

  private clearPendingState(treeId: string, userId: string): void {
    const key = this.pendingKey(treeId, userId);
    this.pendingImages.delete(key);
    this.pendingBulkUpdates.delete(key);
  }

  /**
   * Detects if a message looks like a new independent query/question
   * (not a response to a pending confirmation/clarification).
   * Used to auto-clear stale pending state for unrelated messages.
   */
  private isIndependentQuery(message: string): boolean {
    const trimmed = message.trim().toLowerCase();

    // Confirmation/rejection responses — these ARE responses to pending state
    if (CONFIRMATION_PHRASES.test(trimmed)) return false;
    if (REJECTION_PHRASES.test(trimmed)) return false;

    // Gender clarification ("male", "female") — response to pending image ambiguity
    if (/^(male|female)$/i.test(trimmed)) return false;

    // Any question-like pattern indicates a new independent query
    if (/^(who|what|where|when|why|how|which|tell me|show me|list|explain|describe|find|look up|search)\b/.test(trimmed)) {
      return true;
    }

    // "all children", "all of them" etc. — could be responses to clarification
    // Only treat as independent if it doesn't look like a short answer to a prompt
    if (/^(all\s|both\s|none\s|the\s(first|second|third|last))/i.test(trimmed)) {
      return false;
    }

    return false;
  }

  private isProfileImageRequest(message: string): boolean {
    return /\b(profile\s*(photo|image|picture)|photo|image|picture)\b/i.test(
      message,
    );
  }

  // ─── Bulk update ───────────────────────────────────────────────────────

  /** Separate BULK_UPDATE_PERSONS actions from the rest. */
  private splitBulkActions(actions: AiActionItem[]): {
    bulkActions: AiActionItem[];
    regularActions: AiActionItem[];
  } {
    const bulkActions: AiActionItem[] = [];
    const regularActions: AiActionItem[] = [];

    for (const item of actions) {
      if (item.action === "BULK_UPDATE_PERSONS") {
        bulkActions.push(item);
      } else {
        regularActions.push(item);
      }
    }

    return { bulkActions, regularActions };
  }

  /** Extract validated field→value from the AI person object. */
  private extractBulkUpdates(
    item: AiActionItem,
  ): Record<string, string> {
    const updates: Record<string, string> = {};

    if (!item.person || typeof item.person !== "object") {
      throw new ApiError(400, "No fields provided for bulk update.");
    }

    for (const [aiField, value] of Object.entries(item.person)) {
      if (typeof value !== "string" || !value.trim()) continue;

      const dbColumn = BULK_FIELD_MAP[aiField];
      if (!dbColumn) continue; // silently ignore unknown / protected fields

      updates[dbColumn] = value.trim();
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, "No valid fields provided for bulk update.");
    }

    return updates;
  }

  /** Execute the stored bulk update in a transaction. */
  private async executeBulkUpdate(
    treeId: string,
    updates: Record<string, string>,
  ): Promise<ChatActionResult> {
    try {
      const result = await this.personRepo
        .createQueryBuilder()
        .update(Person)
        .set(updates)
        .where("treeId = :treeId AND deletedAt IS NULL", { treeId })
        .execute();

      const count = result.affected ?? 0;

      return {
        action: "BULK_UPDATE_PERSONS",
        person: null,
        success: true,
        updatedCount: count,
      };
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Bulk update failed.";
      return {
        action: "BULK_UPDATE_PERSONS",
        person: null,
        success: false,
        error: message,
        updatedCount: 0,
      };
    }
  }

  /** Human-readable label for the first updated field. */
  private bulkFieldLabel(updates: Record<string, string>): string {
    const column = Object.keys(updates)[0] ?? "field";
    const label: Record<string, string> = {
      firstName: "first name",
      lastName: "last name",
      gender: "gender",
      birthDate: "birth date",
      deathDate: "death date",
      birthPlace: "birth place",
      currentPlace: "current place",
      healthNote: "health note",
    };
    return label[column] ?? column;
  }

  /** The value being set in the first updated field. */
  private bulkValueLabel(updates: Record<string, string>): string {
    return Object.values(updates)[0] ?? "?";
  }

  // ─── Public chat (no auth, read-only) ──────────────────────────────────

  async sendPublicMessage(
    treeId: string,
    dto: ChatMessageDto,
  ): Promise<{ reply: string }> {
    const tree = await this.treeService.findTreeById(treeId);

    const persons = await this.personRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    });

    const directLookup = this.handleDirectPersonLookup(persons, dto.message);
    if (directLookup) {
      return { reply: directLookup.reply };
    }

    const aiProvider = parseAiModalProvider(
      this.configService.get<string>("AI_MODAL") ?? "",
      "AI_MODAL",
    );

    const aiResult = await this.aiService.callAi({
      systemPrompt: buildSystemPrompt(
        tree.name,
        toPersonSummaries(persons),
      ),
      userMessage: dto.message,
      conversationHistory: dto.previousMessages ?? [],
    });

    const decision = parseAiDecision(aiResult.raw);

    return { reply: decision.reply };
  }
}
