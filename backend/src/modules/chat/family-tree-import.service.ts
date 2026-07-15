import { Injectable } from '@nestjs/common';
import { Person } from '../../entities/Person';
import { ApiError } from '../../utils/ApiError';
import { PersonService } from '../persons/person.service';
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
  constructor(private readonly personService: PersonService) {}

  async tryImport(
    treeId: string,
    userId: string,
    existingPersons: Person[],
    message: string,
  ): Promise<ChatResult | null> {
    const schema = parseImportSchemaFromMessage(message);
    if (!schema) return null;

    if (existingPersons.length > 0) {
      throw new ApiError(
        409,
        'This tree already has people. Create a new empty tree, then paste the import JSON again.',
      );
    }

    const records = parseImportRecords(schema);
    if (records.length === 0) {
      throw new ApiError(400, 'No people were found in the import JSON.');
    }

    const sortedRecords = sortImportRecords(records);
    const externalToDbId = new Map<string, string>();
    const results: ChatResult['results'] = [];
    let created = 0;
    let skipped = 0;

    for (const record of sortedRecords) {
      try {
        const parentId = record.isRoot
          ? null
          : externalToDbId.get(record.parentExternalId ?? '') ?? null;

        if (!record.isRoot && !parentId) {
          throw new ApiError(
            400,
            `Could not resolve parent for ${record.firstName} ${record.lastName}.`,
          );
        }

        const person = await this.personService.create(treeId, userId, {
          first_name: record.firstName,
          last_name: record.lastName,
          gender: record.gender,
          is_root: record.isRoot,
          parent_id: parentId,
        });

        externalToDbId.set(record.externalId, person.id);
        created += 1;
        results.push({ action: 'ADD_PERSON', person, success: true });
      } catch (error) {
        skipped += 1;
        results.push({
          action: 'ADD_PERSON',
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
}
