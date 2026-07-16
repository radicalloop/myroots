import { Injectable } from '@nestjs/common';
import { Person } from '../../entities/Person';
import { ApiError } from '../../utils/ApiError';
import { PersonService } from '../persons/person.service';
import { AiService } from './ai.service';
import { ChatResult } from './types/chat.types';
import {
  countOtherRelatives,
  parseImportRecords,
  parseImportSchemaFromMessage,
  sortImportRecords,
} from './helpers/family-tree-import.parser';
import { getLastAffectedPerson } from './helpers/chat-action.helper';

@Injectable()
export class FamilyTreeImportService {
  constructor(
    private readonly personService: PersonService,
    private readonly aiService: AiService,
  ) {}

  async tryImport(
    treeId: string,
    userId: string,
    existingPersons: Person[],
    message: string,
  ): Promise<ChatResult | null> {
    let schema = parseImportSchemaFromMessage(message);
    const isFlexibleImportRequest = this.looksLikeFlexibleImportRequest(message);

    if (!schema && isFlexibleImportRequest) {
      schema = await this.normalizeImportSchemaWithAi(message);
    }

    if (!schema) return null;

    if (existingPersons.length > 0) {
      throw new ApiError(
        409,
        'This tree already has people. Create a new empty tree, then paste the import JSON again.',
      );
    }

    const records = parseImportRecords(schema);
    if (records.length === 0) {
      throw new ApiError(400, 'No people were found in the tree data.');
    }

    const sortedRecords = sortImportRecords(records);
    const externalToDbId = new Map<string, string>();
    const results: ChatResult['results'] = [];
    let created = 0;
    let skipped = 0;

    for (const record of sortedRecords) {
      try {
        const spouseOfId = record.spouseOfExternalId
          ? externalToDbId.get(record.spouseOfExternalId) ?? null
          : null;
        const parentId = record.isRoot
          ? null
          : externalToDbId.get(record.parentExternalId ?? '') ?? null;

        if (record.spouseOfExternalId && !spouseOfId) {
          throw new ApiError(
            400,
            `Could not resolve spouse target for ${record.firstName} ${record.lastName}.`,
          );
        }

        if (!record.isRoot && !record.spouseOfExternalId && !parentId) {
          throw new ApiError(
            400,
            `Could not resolve parent for ${record.firstName} ${record.lastName}.`,
          );
        }

        const person = record.spouseOfExternalId
          ? await this.personService.addSpouse(treeId, spouseOfId!, userId, {
              first_name: record.firstName,
              last_name: record.lastName,
              gender: record.gender,
            })
          : await this.personService.create(treeId, userId, {
              first_name: record.firstName,
              last_name: record.lastName,
              gender: record.gender,
              is_root: record.isRoot,
              parent_id: parentId,
            });

        externalToDbId.set(record.externalId, person.id);
        created += 1;
        results.push({
          action: record.spouseOfExternalId ? 'ADD_SPOUSE' : 'ADD_PERSON',
          person,
          success: true,
        });
      } catch (error) {
        skipped += 1;
        results.push({
          action: record.spouseOfExternalId ? 'ADD_SPOUSE' : 'ADD_PERSON',
          person: null,
          success: false,
          error:
            error instanceof ApiError
              ? error.message
              : `Could not import ${record.firstName} ${record.lastName}.`,
        });
      }
    }

    const skippedOtherRelatives = countOtherRelatives(schema);
    const failureNote =
      skipped > 0
        ? `\n\n(${skipped} people could not be imported — see details in results.)`
        : '';
    const relativesNote =
      skippedOtherRelatives > 0
        ? ` Skipped ${skippedOtherRelatives} other relatives without explicit parent links in the file.`
        : '';

    return {
      reply: `Imported ${created} people into your family tree.${relativesNote}${failureNote}`,
      action: created > 1 ? 'BATCH' : created === 1 ? 'ADD_PERSON' : 'NONE',
      person: getLastAffectedPerson(results),
      focus_person: getLastAffectedPerson(results),
      results,
    };
  }

  private looksLikeFlexibleImportRequest(message: string): boolean {
    const normalized = message.toLowerCase();
    const hasImportIntent =
      /\b(add|import|create|build|make|load|generate)\b/i.test(message) &&
      /\b(tree|family|people|members|data|json|this)\b/i.test(message);
    const hasStructureHint =
      /[{}\[\]]/.test(message) ||
      /\b(children|child|spouse|wife|husband|father|mother|parent|son|daughter)\b/i.test(
        message,
      ) ||
      /[-=]>|:/.test(message);

    if (hasImportIntent && hasStructureHint) return true;

    return (
      /\b(add|import)\s+this\s+(tree|family|data|json)\b/i.test(normalized) ||
      /\b(add|import)\s+this\b/i.test(normalized) && hasStructureHint
    );
  }

  private async normalizeImportSchemaWithAi(
    message: string,
  ): Promise<ReturnType<typeof parseImportSchemaFromMessage>> {
    const result = await this.aiService.callAi({
      systemPrompt: `You convert arbitrary family tree input into a strict JSON import schema for a family tree app.

Return ONLY valid JSON. Do not include markdown or explanations.

Required output shape:
{
  "proband": {
    "id": "stable-id",
    "name": "Full or given name exactly as provided",
    "gender": "male" | "female" | "other",
    "spouse": { "id": "stable-id", "name": "...", "gender": "...", "children": [] },
    "children": [
      { "id": "stable-id", "name": "...", "gender": "...", "spouse": { ... }, "children": [] }
    ]
  }
}

Rules:
- Accept JSON, pseudo-JSON, plain text, markdown, nested lists, and relationship descriptions.
- Preserve every person name the user provided. Do not invent missing last names.
- If gender is unknown, use "other".
- Use spouse only for wife/husband/spouse relationships.
- Put children under the biological/main parent named in the input; if a married couple has children, put children under one spouse only.
- Generate stable string ids if the user did not provide ids.
- If the input is not family tree data, return {"error":"not_family_tree_data"}.`,
      userMessage: message,
    });

    const schema = parseImportSchemaFromMessage(result.raw);
    if (!schema) {
      throw new ApiError(
        400,
        "I couldn't understand that family tree data well enough to import it. Please include names and relationships like spouse/children/parents.",
      );
    }

    return schema;
  }
}
