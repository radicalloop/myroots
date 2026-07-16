import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Person } from "../../entities/Person";
import { PersonSpouse } from "../../entities/PersonSpouse";
import { User } from "../../entities/User";
import { ApiError } from "../../utils/ApiError";
import { TreeService } from "../trees/tree.service";
import { PersonService } from "../persons/person.service";
import { AiService } from "./ai.service";
import { S3Service } from "../storage/s3.service";
import { ChatMessageDto } from "./dto/chat.dto";
import {
  formatPersonName,
  NameResolution,
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

interface PendingMissingLastNameUpdate {
  originalAiReply: string;
}

type RelationshipKey =
  | "wife"
  | "husband"
  | "spouse"
  | "son"
  | "daughter"
  | "children"
  | "brother"
  | "sister"
  | "siblings"
  | "father"
  | "mother"
  | "parents";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly pendingImages = new Map<string, PendingChatImage>();
  private readonly pendingBulkUpdates = new Map<string, PendingBulkUpdate>();
  private readonly pendingMissingLastNameUpdates =
    new Map<string, PendingMissingLastNameUpdate>();

  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(PersonSpouse)
    private readonly spouseRepo: Repository<PersonSpouse>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
    const spouseRows = await this.spouseRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    });
    const currentUser = await this.userRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
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

    const structuredPersonAction = this.buildStructuredPersonAction(dto.message);
    if (structuredPersonAction) {
      const outcome = await executeChatActions(
        this.personRepo,
        this.personService,
        treeId,
        userId,
        persons,
        [structuredPersonAction],
      );
      const reply = buildResultReply(
        this.buildStructuredPersonReply(structuredPersonAction),
        outcome.results,
      );
      const action = summarizeChatAction(outcome.results);

      return {
        reply,
        action: action === "NONE" ? "NONE" : action,
        person: getLastAffectedPerson(outcome.results),
        focus_person: getLastAffectedPerson(outcome.results),
        results: outcome.results,
      };
    }

    const spouseRelationshipActions = this.buildSpouseRelationshipActions(
      dto.message,
      persons,
    );
    if (spouseRelationshipActions.length > 0) {
      const outcome = await executeChatActions(
        this.personRepo,
        this.personService,
        treeId,
        userId,
        persons,
        spouseRelationshipActions,
      );
      const reply = buildResultReply(
        this.buildSpouseRelationshipReply(spouseRelationshipActions),
        outcome.results,
      );
      const action = summarizeChatAction(outcome.results);

      return {
        reply,
        action: action === "NONE" ? "NONE" : action,
        person: getLastAffectedPerson(outcome.results),
        focus_person: getLastAffectedPerson(outcome.results),
        results: outcome.results,
      };
    }

    const familyOverview = this.handleFamilyOverviewQuery(
      tree.name,
      persons,
      spouseRows,
      dto.message,
    );
    if (familyOverview) {
      return familyOverview;
    }

    const relationshipLookup = this.handleCurrentUserRelationshipLookup(
      persons,
      spouseRows,
      currentUser,
      dto.message,
    );
    if (relationshipLookup) {
      return relationshipLookup;
    }

    const namedRelationshipLookup = this.handleNamedRelationshipLookup(
      persons,
      spouseRows,
      dto.message,
    );
    if (namedRelationshipLookup) {
      return namedRelationshipLookup;
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
    let pendingMissingLastName =
      this.pendingMissingLastNameUpdates.get(cacheKey);

    // If the user sends an unrelated message (not confirm/reject) while
    // pending state exists, treat it as a new independent intent.
    if (pendingBulk && this.isIndependentQuery(dto.message)) {
      this.logger.log(`Clearing pending bulk update due to new independent query`);
      this.clearPendingState(treeId, userId);
      pendingBulk = undefined;
    }

    if (pendingMissingLastName && this.isIndependentQuery(dto.message)) {
      this.logger.log(
        `Clearing pending missing-last-name update due to new independent query`,
      );
      this.clearPendingState(treeId, userId);
      pendingMissingLastName = undefined;
    }

    if (pendingMissingLastName) {
      const lastName = this.extractMissingLastNameValue(dto.message);
      if (lastName) {
        const result = await this.executeMissingLastNameUpdate(treeId, lastName);
        this.pendingMissingLastNameUpdates.delete(cacheKey);
        return {
          reply: `Updated ${result.updatedCount} people with missing last names to "${lastName}".`,
          action: "BULK_UPDATE_PERSONS",
          person: null,
          focus_person: null,
          results: [result],
        };
      }

      return {
        reply: pendingMissingLastName.originalAiReply,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    const missingLastNameRequest = await this.handleMissingLastNameUpdateRequest(
      treeId,
      cacheKey,
      dto.message,
    );
    if (missingLastNameRequest) {
      return missingLastNameRequest;
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

    const pendingImageFollowUp = await this.handlePendingProfileImageFollowUp(
      persons,
      treeId,
      userId,
      cacheKey,
      dto.message,
      hasIncomingImage,
    );
    if (pendingImageFollowUp) {
      return pendingImageFollowUp;
    }

    if (
      !hasIncomingImage &&
      this.pendingImages.has(cacheKey) &&
      this.isIndependentQuery(dto.message)
    ) {
      this.logger.log(`Clearing stale pending image for new independent query`);
      this.pendingImages.delete(cacheKey);
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
        toPersonSummaries(persons, spouseRows),
        currentUser
          ? {
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              email: currentUser.email,
            }
          : null,
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

  private async handlePendingProfileImageFollowUp(
    persons: Person[],
    treeId: string,
    userId: string,
    cacheKey: string,
    message: string,
    hasIncomingImage: boolean,
  ): Promise<ChatResult | null> {
    if (hasIncomingImage) return null;

    const pendingImage = this.pendingImages.get(cacheKey);
    if (!pendingImage) return null;

    const targetName = this.extractPendingImageTargetName(message);
    if (!targetName) return null;

    const results = await applyProfileImageUpdates(
      this.personService,
      persons,
      treeId,
      userId,
      pendingImage,
      [{ targetName }],
    );
    const action = summarizeChatAction(results);
    const affectedPerson = getLastAffectedPerson(results);

    if (results.some((result) => result.success)) {
      this.pendingImages.delete(cacheKey);
    }

    return {
      reply: buildResultReply(
        `Set ${targetName}'s profile photo.`,
        results,
      ),
      action: action === "NONE" ? "NONE" : action,
      person: affectedPerson,
      focus_person: affectedPerson,
      results,
    };
  }

  private extractPendingImageTargetName(message: string): string | null {
    const trimmed = message
      .trim()
      .replace(/\*\*/g, "")
      .replace(/[.!?]+$/g, "")
      .trim();

    if (!trimmed || trimmed.length > 100) return null;

    const patterns = [
      /^(?:set|use|apply)\s+(?:it|this|photo|image|picture)?\s*(?:as\s+)?(?:profile\s+)?(?:photo|image|picture)?\s*(?:for|to|on)\s+(.+)$/i,
      /^(?:this|it)\s+is\s+(.+)$/i,
      /^(?:for|to|on)\s+(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      const value = match?.[1]?.trim();
      if (value) return value;
    }

    if (
      /^(who|what|where|when|why|how|which|tell|show|list|explain|describe|find|add|edit|delete|remove|clear)\b/i.test(
        trimmed,
      )
    ) {
      return null;
    }

    if (!/[A-Za-z]/.test(trimmed)) return null;

    return trimmed;
  }

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

  private buildStructuredPersonAction(message: string): AiActionItem | null {
    if (!/\badd\s+a\s+person\b/i.test(message)) return null;

    const firstName = this.extractStructuredField(message, "first name");
    const lastName = this.extractStructuredField(message, "last name");
    const gender = this.extractStructuredField(message, "gender");
    const targetName = this.extractStructuredField(message, "where to add");
    const relationship = this.extractStructuredField(message, "relationship");

    if (!firstName || !lastName || !relationship) return null;

    const normalizedRelationship = relationship.toLowerCase();
    const person = {
      first_name: firstName,
      last_name: lastName,
      gender: this.normalizeGender(gender),
    };

    if (
      normalizedRelationship === "child" ||
      normalizedRelationship === "children"
    ) {
      if (!targetName) return null;

      return {
        action: "ADD_PERSON",
        target_name: null,
        person: {
          ...person,
          parent_name: targetName,
        },
      };
    }

    if (
      normalizedRelationship === "spouse" ||
      normalizedRelationship === "wife" ||
      normalizedRelationship === "husband"
    ) {
      if (!targetName) return null;

      return {
        action: "ADD_SPOUSE",
        target_name: targetName,
        person: {
          ...person,
          gender:
            normalizedRelationship === "wife"
              ? "FEMALE"
              : normalizedRelationship === "husband"
                ? "MALE"
                : person.gender,
        },
      };
    }

    if (normalizedRelationship === "parent") {
      if (!targetName) return null;

      return {
        action: "ADD_PARENT",
        target_name: targetName,
        person,
      };
    }

    return null;
  }

  private extractStructuredField(
    message: string,
    label: string,
  ): string | null {
    const labels = [
      "first name",
      "last name",
      "gender",
      "where to add",
      "relationship",
    ];
    const otherLabels = labels
      .filter((candidate) => candidate !== label)
      .map((candidate) => candidate.replace(/\s+/g, "\\s+"))
      .join("|");
    const escapedLabel = label.replace(/\s+/g, "\\s+");
    const pattern = new RegExp(
      `${escapedLabel}\\s*:\\s*(.*?)(?=\\s+(?:${otherLabels})\\s*:|$)`,
      "i",
    );
    const match = message.match(pattern);
    const value = match?.[1]?.trim().replace(/[.。]+$/g, "").trim();

    return value || null;
  }

  private normalizeGender(gender: string | null): string {
    const normalized = gender?.trim().toUpperCase();

    if (normalized === "F" || normalized === "FEMALE") return "FEMALE";
    if (normalized === "M" || normalized === "MALE") return "MALE";

    return "OTHER";
  }

  private buildStructuredPersonReply(action: AiActionItem): string {
    const name = [action.person?.first_name, action.person?.last_name]
      .filter(Boolean)
      .join(" ");

    if (action.action === "ADD_PERSON") {
      return `Added ${name} as a child of ${action.person?.parent_name}.`;
    }

    if (action.action === "ADD_SPOUSE") {
      return `Added ${name} as spouse of ${action.target_name}.`;
    }

    if (action.action === "ADD_PARENT") {
      return `Added ${name} as parent of ${action.target_name}.`;
    }

    return `Added ${name}.`;
  }

  private buildSpouseRelationshipActions(
    message: string,
    persons: Person[],
  ): AiActionItem[] {
    const normalizedMessage = message
      .replace(/\*\*/g, "")
      .replace(/^[\s*-]+/gm, "")
      .trim();
    const actions: AiActionItem[] = [];
    const pattern =
      /\badd\s+([A-Za-z][A-Za-z\s.'-]*?)\s+as\s+(?:the\s+)?(wife|husband|spouse)\s+of\s+([A-Za-z][A-Za-z\s.'-]*?)(?:,\s*([^.\n]*))?(?=\.|\n|$)/gi;

    for (const match of normalizedMessage.matchAll(pattern)) {
      const spouseName = match[1].trim();
      const relationship = match[2].toLowerCase();
      const targetName = match[3].trim();
      const targetContext = match[4]?.trim() ?? "";
      if (!spouseName || !targetName) continue;

      const resolvedTarget = this.resolveSpouseTargetFromContext(
        persons,
        targetName,
        relationship,
        targetContext,
      );
      const resolvedTargetName = resolvedTarget
        ? formatPersonName(resolvedTarget)
        : targetName;
      const spouse = resolvePersonByName(persons, spouseName);

      actions.push({
        action: "ADD_SPOUSE",
        target_name: resolvedTargetName,
        target_id: resolvedTarget?.id,
        person:
          spouse.kind === "found"
            ? { spouse_name: formatPersonName(spouse.person) }
            : spouse.kind === "ambiguous"
              ? { spouse_name: spouseName }
            : {
                ...this.nameToPersonFields(
                  spouseName,
                  resolvedTarget?.lastName,
                ),
                gender: relationship === "husband" ? "MALE" : "FEMALE",
              },
      });
    }

    return actions;
  }

  private resolveSpouseTargetFromContext(
    persons: Person[],
    targetName: string,
    relationship: string,
    context: string,
  ): Person | null {
    const resolved = resolvePersonByName(persons, targetName);
    if (resolved.kind === "found") {
      return resolved.person;
    }

    if (resolved.kind !== "ambiguous") {
      return null;
    }

    const parentNames = this.extractRelationshipNames(
      context,
      /(?:son|daughter|child)\s+of\s+(.+?)(?=\s+and\s+(?:the\s+)?(?:father|mother|parent)\s+of|$)/i,
    );
    const childNames = this.extractRelationshipNames(
      context,
      /(?:father|mother|parent)\s+of\s+(.+)$/i,
    );
    const siblingNames = this.extractRelationshipNames(
      context,
      /(?:brother|sister|sibling)\s+of\s+(.+)$/i,
    );
    const rootHint = /\broot\s+person\b/i.test(context);

    let best: { person: Person; score: number } | null = null;
    let tied = false;

    for (const candidate of resolved.matches) {
      let score = 0;

      if (relationship === "wife" && candidate.gender === "MALE") score += 1;
      if (relationship === "husband" && candidate.gender === "FEMALE") score += 1;
      if (rootHint && candidate.isRoot) score += 5;

      const parent = candidate.parentId
        ? persons.find((person) => person.id === candidate.parentId)
        : null;
      if (parent) {
        score += parentNames.filter((name) =>
          this.personMatchesRelationshipName(parent, name),
        ).length * 3;
      }

      const children = persons.filter(
        (person) => person.parentId === candidate.id,
      );
      for (const childName of childNames) {
        if (
          children.some((child) =>
            this.personMatchesRelationshipName(child, childName),
          )
        ) {
          score += 3;
        }
      }

      if (candidate.parentId) {
        const siblings = persons.filter(
          (person) =>
            person.parentId === candidate.parentId &&
            person.id !== candidate.id,
        );
        for (const siblingName of siblingNames) {
          if (
            siblings.some((sibling) =>
              this.personMatchesRelationshipName(sibling, siblingName),
            )
          ) {
            score += 3;
          }
        }
      }

      if (!best || score > best.score) {
        best = { person: candidate, score };
        tied = false;
      } else if (score === best.score) {
        tied = true;
      }
    }

    return best && best.score > 0 && !tied ? best.person : null;
  }

  private extractRelationshipNames(
    context: string,
    pattern: RegExp,
  ): string[] {
    const match = context.match(pattern);
    if (!match) return [];

    return match[1]
      .replace(/\b(the|a|an)\b/gi, " ")
      .split(/\s*(?:,|&|\band\b)\s*/i)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  private personMatchesRelationshipName(person: Person, name: string): boolean {
    const normalized = this.normalizeRelationshipName(name);
    const fullName = this.normalizeRelationshipName(formatPersonName(person));
    const firstName = this.normalizeRelationshipName(person.firstName);

    return (
      normalized === fullName ||
      normalized === firstName ||
      fullName.startsWith(`${normalized} `)
    );
  }

  private normalizeRelationshipName(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private nameToPersonFields(
    fullName: string,
    fallbackLastName?: string,
  ): { first_name: string; last_name: string } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return { first_name: parts[0], last_name: fallbackLastName || "-" };
    }

    return {
      first_name: parts.slice(0, -1).join(" "),
      last_name: parts[parts.length - 1],
    };
  }

  private buildSpouseRelationshipReply(actions: AiActionItem[]): string {
    if (actions.length === 1) {
      const action = actions[0];
      const spouseName =
        action.person?.spouse_name ??
        [action.person?.first_name, action.person?.last_name]
          .filter(Boolean)
          .join(" ");

      return `Added ${spouseName} as spouse of ${action.target_name}.`;
    }

    return `Added or linked ${actions.length} spouse relationships.`;
  }

  private handleFamilyOverviewQuery(
    treeName: string,
    persons: Person[],
    spouseRows: PersonSpouse[],
    message: string,
  ): ChatResult | null {
    if (!this.isFamilyOverviewQuery(message)) return null;

    return {
      reply: this.buildFamilyOverviewReply(treeName, persons, spouseRows),
      action: "NONE",
      person: null,
      focus_person: null,
      results: [],
    };
  }

  private isFamilyOverviewQuery(message: string): boolean {
    const normalized = message.trim().toLowerCase();

    return (
      /\b(tell me about|describe|summarize|summary|overview|explain)\b/.test(
        normalized,
      ) &&
      /\b(my\s+)?family\s+(history|tree|lineage)\b/.test(normalized)
    ) || /\bwhat\s+is\s+(my\s+)?family\s+(history|tree|lineage)\b/.test(
      normalized,
    );
  }

  private buildFamilyOverviewReply(
    treeName: string,
    persons: Person[],
    spouseRows: PersonSpouse[],
  ): string {
    if (persons.length === 0) {
      return `## ${treeName}\nNo people have been added to this family tree yet.`;
    }

    const root =
      persons.find((person) => person.isRoot) ??
      persons.find((person) => !person.parentId) ??
      persons[0];
    const men = persons.filter((person) => person.gender === "MALE").length;
    const women = persons.filter((person) => person.gender === "FEMALE").length;
    const other = persons.length - men - women;
    const generationCount = this.countGenerations(root, persons, spouseRows);
    const surnames = this.getCommonSurnames(persons);
    const rootChildren = this.getFamilyChildren(root, persons, spouseRows);

    const lines = [
      `## ${treeName} overview`,
      `- **Earliest recorded person:** ${formatPersonName(root)}`,
      `- **People recorded:** ${persons.length}`,
      `- **Gender split:** ${men} men, ${women} women${other > 0 ? `, ${other} other` : ""}`,
      `- **Generations:** ${generationCount}`,
      `- **Couples recorded:** ${spouseRows.length}`,
    ];

    if (surnames.length > 0) {
      lines.push(`- **Family names:** ${surnames.join(", ")}`);
    }

    if (rootChildren.length > 0) {
      lines.push(
        "",
        "## Main branches",
        ...rootChildren
          .slice(0, 8)
          .map((child) => `- **${formatPersonName(child)}**`),
      );
    }

    lines.push(
      "",
      "You can ask me about any person, spouse, children, ancestors, or a specific branch in this tree.",
    );

    return lines.join("\n");
  }

  private countGenerations(
    root: Person,
    persons: Person[],
    spouseRows: PersonSpouse[],
  ): number {
    const visit = (person: Person, seen: Set<string>): number => {
      if (seen.has(person.id)) return 0;

      const children = this.getFamilyChildren(person, persons, spouseRows);
      if (children.length === 0) return 1;

      const nextSeen = new Set(seen);
      nextSeen.add(person.id);

      return 1 + Math.max(...children.map((child) => visit(child, nextSeen)));
    };

    return visit(root, new Set());
  }

  private getFamilyChildren(
    person: Person,
    persons: Person[],
    spouseRows: PersonSpouse[],
  ): Person[] {
    const parentIds = new Set<string>([
      person.id,
      ...this.getSpouses(person, persons, spouseRows).map((spouse) => spouse.id),
    ]);

    return persons.filter(
      (candidate) => candidate.parentId && parentIds.has(candidate.parentId),
    );
  }

  private getCommonSurnames(persons: Person[]): string[] {
    const counts = new Map<string, number>();

    for (const person of persons) {
      const lastName = person.lastName.trim();
      if (!lastName || lastName === "-") continue;
      counts.set(lastName, (counts.get(lastName) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 6)
      .map(([lastName]) => lastName);
  }

  private handleCurrentUserRelationshipLookup(
    persons: Person[],
    spouseRows: PersonSpouse[],
    currentUser: User | null,
    message: string,
  ): ChatResult | null {
    if (this.isCurrentUserRelationshipActionRequest(message)) return null;

    const relationships = this.extractCurrentUserRelationships(message);
    if (relationships.length === 0) return null;

    if (!currentUser) {
      return {
        reply:
          "I can't tell who 'my' refers to because I couldn't load the signed-in user.",
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    const currentPerson = this.resolveCurrentUserPerson(persons, currentUser);
    if (currentPerson.kind === "not_found") {
      return {
        reply: `I know you're signed in as ${this.formatUserName(currentUser)}, but I couldn't find that exact person in this tree. Add or rename the matching person first, then I can answer questions like "my wife" or "my son".`,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    if (currentPerson.kind === "ambiguous") {
      return {
        reply: `I found multiple people named ${this.formatUserName(currentUser)} in this tree, so I can't safely tell which one is you. Please make the person names unique or ask using the person's full context.`,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    const replyParts: string[] = [];
    const allRelatedPeople: Person[] = [];

    for (const relationship of relationships) {
      const relatedPeople = this.getRelatedPeople(
        currentPerson.person,
        relationship,
        persons,
        spouseRows,
      );
      allRelatedPeople.push(...relatedPeople);
      replyParts.push(
        this.buildRelationshipReply(relationship, relatedPeople),
      );
    }

    const uniqueRelatedPeople = Array.from(
      new Map(allRelatedPeople.map((person) => [person.id, person])).values(),
    );

    return {
      reply: replyParts.join(" "),
      action: "NONE",
      person: null,
      focus_person:
        uniqueRelatedPeople.length === 1
          ? mapPersonToResponse(uniqueRelatedPeople[0])
          : null,
      results: [],
    };
  }

  private isCurrentUserRelationshipActionRequest(message: string): boolean {
    return /\b(add|create|edit|update|change|set|link|upload|attach)\b/i.test(
      message,
    );
  }

  private extractCurrentUserRelationships(message: string): RelationshipKey[] {
    const patterns: Array<{
      relationship: RelationshipKey;
      pattern: RegExp;
    }> = [
      { relationship: "wife", pattern: /\bmy\s+wife(?:'s)?\b/i },
      { relationship: "husband", pattern: /\bmy\s+husband(?:'s)?\b/i },
      { relationship: "spouse", pattern: /\bmy\s+spouse(?:'s)?\b/i },
      { relationship: "son", pattern: /\bmy\s+sons?(?:'s)?\b/i },
      { relationship: "daughter", pattern: /\bmy\s+daughters?(?:'s)?\b/i },
      {
        relationship: "children",
        pattern: /\bmy\s+(?:children|child|kids?)(?:'s)?\b/i,
      },
      { relationship: "brother", pattern: /\bmy\s+brothers?(?:'s)?\b/i },
      { relationship: "sister", pattern: /\bmy\s+sisters?(?:'s)?\b/i },
      { relationship: "siblings", pattern: /\bmy\s+siblings?(?:'s)?\b/i },
      { relationship: "father", pattern: /\bmy\s+(?:father|dad)(?:'s)?\b/i },
      { relationship: "mother", pattern: /\bmy\s+(?:mother|mom)(?:'s)?\b/i },
      { relationship: "parents", pattern: /\bmy\s+parents?(?:'s)?\b/i },
    ];

    return patterns
      .filter(({ pattern }) => pattern.test(message))
      .map(({ relationship }) => relationship);
  }

  private handleNamedRelationshipLookup(
    persons: Person[],
    spouseRows: PersonSpouse[],
    message: string,
  ): ChatResult | null {
    if (this.isCurrentUserRelationshipActionRequest(message)) return null;

    const relationshipQuestion = this.extractNamedRelationshipQuestion(message);
    if (!relationshipQuestion) return null;

    const resolved = resolvePersonByName(persons, relationshipQuestion.name);

    if (resolved.kind === "ambiguous") {
      const options = resolved.matches.map((person) => {
        const gender = person.gender
          ? ` (${person.gender.toLowerCase()})`
          : "";
        return `${formatPersonName(person)}${gender}`;
      });

      return {
        reply: `I found multiple people matching "${relationshipQuestion.name}" in this tree. Please be more specific: ${options.join(", ")}.`,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    if (resolved.kind !== "found") {
      return {
        reply: `I couldn't find anyone named "${relationshipQuestion.name}" in this tree.`,
        action: "NONE",
        person: null,
        focus_person: null,
        results: [],
      };
    }

    const relatedPeople = this.getRelatedPeople(
      resolved.person,
      relationshipQuestion.relationship,
      persons,
      spouseRows,
    );

    return {
      reply: this.buildNamedRelationshipReply(
        resolved.person,
        relationshipQuestion.relationship,
        relatedPeople,
      ),
      action: "NONE",
      person: null,
      focus_person:
        relatedPeople.length === 1 ? mapPersonToResponse(relatedPeople[0]) : null,
      results: [],
    };
  }

  private extractNamedRelationshipQuestion(
    message: string,
  ): { name: string; relationship: RelationshipKey } | null {
    const normalized = this.normalizeChatQuestion(message);
    const possessiveMatch = normalized.match(
      /^(?:who\s+(?:is|are)|what\s+(?:is|are)|tell\s+me\s+about|show\s+me|find)\s+(.+?)(?:['’]s)?\s+(wife|husband|spouse|children|child|kids?|sons?|daughters?|father|dad|mother|mom|parents?|siblings?|brothers?|sisters?)$/i,
    );
    const ofMatch = normalized.match(
      /^(?:who\s+(?:is|are)|what\s+(?:is|are)|tell\s+me\s+about|show\s+me|find)\s+(?:the\s+)?(wife|husband|spouse|children|child|kids?|sons?|daughters?|father|dad|mother|mom|parents?|siblings?|brothers?|sisters?)\s+of\s+(.+)$/i,
    );

    const name = (possessiveMatch?.[1] ?? ofMatch?.[2] ?? "")
      .trim()
      .replace(/^person\s+/i, "")
      .trim();
    const relationship = this.normalizeRelationshipWord(
      possessiveMatch?.[2] ?? ofMatch?.[1] ?? "",
    );

    if (!name || name.length > 80 || !relationship) return null;

    return { name, relationship };
  }

  private normalizeRelationshipWord(word: string): RelationshipKey | null {
    const normalized = word.toLowerCase();

    if (normalized === "wife") return "wife";
    if (normalized === "husband") return "husband";
    if (normalized === "spouse") return "spouse";
    if (/^sons?$/.test(normalized)) return "son";
    if (/^daughters?$/.test(normalized)) return "daughter";
    if (/^(children|child|kids?)$/.test(normalized)) return "children";
    if (/^(father|dad)$/.test(normalized)) return "father";
    if (/^(mother|mom)$/.test(normalized)) return "mother";
    if (/^parents?$/.test(normalized)) return "parents";
    if (/^brothers?$/.test(normalized)) return "brother";
    if (/^sisters?$/.test(normalized)) return "sister";
    if (/^siblings?$/.test(normalized)) return "siblings";

    return null;
  }

  private resolveCurrentUserPerson(
    persons: Person[],
    currentUser: User,
  ): NameResolution {
    const normalizedUserName = this.normalizeRelationshipName(
      this.formatUserName(currentUser),
    );
    const matches = persons.filter(
      (person) =>
        this.normalizeRelationshipName(formatPersonName(person)) ===
        normalizedUserName,
    );

    if (matches.length === 1) return { kind: "found", person: matches[0] };
    if (matches.length > 1) return { kind: "ambiguous", matches };

    return { kind: "not_found" };
  }

  private getRelatedPeople(
    currentPerson: Person,
    relationship: string,
    persons: Person[],
    spouseRows: PersonSpouse[],
  ): Person[] {
    const spouses = this.getSpouses(currentPerson, persons, spouseRows);
    const childParentIds = new Set([
      currentPerson.id,
      ...spouses.map((spouse) => spouse.id),
    ]);
    const children = persons.filter(
      (person) => person.parentId && childParentIds.has(person.parentId),
    );
    const siblings = currentPerson.parentId
      ? persons.filter(
          (person) =>
            person.parentId === currentPerson.parentId &&
            person.id !== currentPerson.id,
        )
      : [];
    const parent = currentPerson.parentId
      ? persons.find((person) => person.id === currentPerson.parentId) ?? null
      : null;
    const parents = parent
      ? [
          parent,
          ...this.getSpouses(parent, persons, spouseRows),
        ]
      : [];

    switch (relationship) {
      case "wife":
        return spouses.filter((person) => person.gender === "FEMALE");
      case "husband":
        return spouses.filter((person) => person.gender === "MALE");
      case "spouse":
        return spouses;
      case "son":
        return children.filter((person) => person.gender === "MALE");
      case "daughter":
        return children.filter((person) => person.gender === "FEMALE");
      case "children":
        return children;
      case "brother":
        return siblings.filter((person) => person.gender === "MALE");
      case "sister":
        return siblings.filter((person) => person.gender === "FEMALE");
      case "siblings":
        return siblings;
      case "father":
        return parents.filter((person) => person.gender === "MALE");
      case "mother":
        return parents.filter((person) => person.gender === "FEMALE");
      case "parents":
        return parents;
      default:
        return [];
    }
  }

  private getSpouses(
    person: Person,
    persons: Person[],
    spouseRows: PersonSpouse[],
  ): Person[] {
    const spouseIds = spouseRows
      .filter((row) => row.personId === person.id || row.spouseId === person.id)
      .map((row) => (row.personId === person.id ? row.spouseId : row.personId));

    return spouseIds
      .map((spouseId) => persons.find((candidate) => candidate.id === spouseId))
      .filter((candidate): candidate is Person => Boolean(candidate));
  }

  private buildRelationshipReply(
    relationship: string,
    relatedPeople: Person[],
  ): string {
    const label = this.relationshipLabel(relationship, relatedPeople.length);
    if (relatedPeople.length === 0) {
      return `I couldn't find a recorded ${label} for you in this tree.`;
    }

    const names = relatedPeople.map((person) => formatPersonName(person));
    if (relatedPeople.length === 1) {
      return `Your ${label} is ${names[0]}.`;
    }

    return `Your ${label} are ${this.joinNames(names)}.`;
  }

  private buildNamedRelationshipReply(
    person: Person,
    relationship: RelationshipKey,
    relatedPeople: Person[],
  ): string {
    const personName = formatPersonName(person);
    const label = this.relationshipLabel(relationship, relatedPeople.length);

    if (relatedPeople.length === 0) {
      return `I couldn't find a recorded ${label} for ${personName} in this tree.`;
    }

    const names = relatedPeople.map((relatedPerson) =>
      formatPersonName(relatedPerson),
    );

    if (relatedPeople.length === 1) {
      return `${personName}'s ${label} is ${names[0]}.`;
    }

    return `${personName}'s ${label} are ${this.joinNames(names)}.`;
  }

  private relationshipLabel(relationship: string, count: number): string {
    const labels: Record<string, { singular: string; plural: string }> = {
      wife: { singular: "wife", plural: "wives" },
      husband: { singular: "husband", plural: "husbands" },
      spouse: { singular: "spouse", plural: "spouses" },
      son: { singular: "son", plural: "sons" },
      daughter: { singular: "daughter", plural: "daughters" },
      children: { singular: "child", plural: "children" },
      brother: { singular: "brother", plural: "brothers" },
      sister: { singular: "sister", plural: "sisters" },
      siblings: { singular: "sibling", plural: "siblings" },
      father: { singular: "father", plural: "fathers" },
      mother: { singular: "mother", plural: "mothers" },
      parents: { singular: "parent", plural: "parents" },
    };
    const label = labels[relationship] ?? {
      singular: relationship,
      plural: relationship,
    };

    return count <= 1 ? label.singular : label.plural;
  }

  private joinNames(names: string[]): string {
    if (names.length <= 2) return names.join(" and ");

    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }

  private formatUserName(user: User): string {
    return [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
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
    const trimmed = this.normalizeChatQuestion(message);
    if (this.extractNamedRelationshipQuestion(trimmed)) return null;

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

  private normalizeChatQuestion(message: string): string {
    return message
      .trim()
      .replace(/\s*--snapshot-[\w-]+\s*$/i, "")
      .replace(/[?.!]+$/g, "")
      .trim();
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
    this.pendingMissingLastNameUpdates.delete(key);
  }

  private async handleMissingLastNameUpdateRequest(
    treeId: string,
    cacheKey: string,
    message: string,
  ): Promise<ChatResult | null> {
    if (!this.isMissingLastNameUpdateRequest(message)) return null;

    const lastName = this.extractMissingLastNameValue(message);
    if (lastName) {
      const result = await this.executeMissingLastNameUpdate(treeId, lastName);
      return {
        reply: `Updated ${result.updatedCount} people with missing last names to "${lastName}".`,
        action: "BULK_UPDATE_PERSONS",
        person: null,
        focus_person: null,
        results: [result],
      };
    }

    const reply =
      'I can update missing last names, but I need the last name value. Please reply with the last name, for example: "Shah".';
    this.pendingMissingLastNameUpdates.set(cacheKey, {
      originalAiReply: reply,
    });

    return {
      reply,
      action: "NONE",
      person: null,
      focus_person: null,
      results: [],
    };
  }

  private isMissingLastNameUpdateRequest(message: string): boolean {
    const normalized = message.toLowerCase();

    return (
      /\b(update|change|set|fill)\b/.test(normalized) &&
      /\blast\s+name\b/.test(normalized) &&
      /\b(missing|empty|blank|null|not\s+set|no\s+last\s+name)\b/.test(
        normalized,
      )
    );
  }

  private extractMissingLastNameValue(message: string): string | null {
    const patterns = [
      /\blast\s+name\s+(?:to|as)\s+["']?([A-Za-z][A-Za-z\s.'-]{0,98})["']?/i,
      /\blast\s+name\s+["']([A-Za-z][A-Za-z\s.'-]{0,98})["']/i,
      /\bto\s+["']([A-Za-z][A-Za-z\s.'-]{0,98})["']/i,
      /["']([A-Za-z][A-Za-z\s.'-]{0,98})["']/i,
      /^["']?([A-Za-z][A-Za-z\s.'-]{0,98})["']?$/i,
    ];

    for (const pattern of patterns) {
      const match = message.trim().match(pattern);
      const value = match?.[1]
        ?.trim()
        .replace(/[.!?]+$/g, "")
        .replace(/^["']|["']$/g, "")
        .trim();
      if (value && !/\s/.test(value)) return value;
    }

    return null;
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

  private async executeMissingLastNameUpdate(
    treeId: string,
    lastName: string,
  ): Promise<ChatActionResult> {
    try {
      const result = await this.personRepo
        .createQueryBuilder()
        .update(Person)
        .set({ lastName })
        .where("treeId = :treeId AND deletedAt IS NULL", { treeId })
        .andWhere(
          `(lastName IS NULL OR TRIM(lastName) = '' OR TRIM(lastName) = '-' OR TRIM(lastName) = '.')`,
        )
        .execute();

      return {
        action: "BULK_UPDATE_PERSONS",
        person: null,
        success: true,
        updatedCount: result.affected ?? 0,
      };
    } catch {
      return {
        action: "BULK_UPDATE_PERSONS",
        person: null,
        success: false,
        error: "Could not update missing last names.",
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
    const spouseRows = await this.spouseRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: "ASC" },
    });

    const namedRelationshipLookup = this.handleNamedRelationshipLookup(
      persons,
      spouseRows,
      dto.message,
    );
    if (namedRelationshipLookup) {
      return { reply: namedRelationshipLookup.reply };
    }

    const directLookup = this.handleDirectPersonLookup(persons, dto.message);
    if (directLookup) {
      return { reply: directLookup.reply };
    }

    const familyOverview = this.handleFamilyOverviewQuery(
      tree.name,
      persons,
      spouseRows,
      dto.message,
    );
    if (familyOverview) {
      return { reply: familyOverview.reply };
    }

    const aiProvider = parseAiModalProvider(
      this.configService.get<string>("AI_MODAL") ?? "",
      "AI_MODAL",
    );

    const aiResult = await this.aiService.callAi({
      systemPrompt: buildSystemPrompt(
        tree.name,
        toPersonSummaries(persons, spouseRows),
      ),
      userMessage: dto.message,
      conversationHistory: dto.previousMessages ?? [],
    });

    const decision = parseAiDecision(aiResult.raw);

    return { reply: decision.reply };
  }
}
