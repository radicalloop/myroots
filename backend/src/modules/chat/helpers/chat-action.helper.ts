import { IsNull, Repository } from 'typeorm';
import { Person } from '../../../entities/Person';
import { ApiError } from '../../../utils/ApiError';
import { PersonService } from '../../persons/person.service';
import { PersonResponse } from '../../persons/helpers/person.mapper';
import {
  AiActionItem,
  ChatAction,
  ChatActionResult,
} from '../types/chat.types';
import {
  buildCreatePayload,
  buildUpdatePayload,
  buildSpousePayload,
  buildParentPayload,
  resolvePersonByName,
} from './chat.helper';

async function reloadPersons(
  personRepo: Repository<Person>,
  treeId: string,
): Promise<Person[]> {
  return personRepo.find({
    where: { treeId, deletedAt: IsNull() },
    order: { createdAt: 'ASC' },
  });
}

async function applySingleAction(
  personService: PersonService,
  treeId: string,
  userId: string,
  persons: Person[],
  item: AiActionItem,
): Promise<PersonResponse> {
  if (item.action === 'ADD_PERSON') {
    if (!item.person || typeof item.person !== 'object' || Object.keys(item.person).length === 0) {
      throw new ApiError(400, "I'd be happy to add them. Could you tell me their first name and last name? You can also include gender, birth date, and birth place if you have them.");
    }

    const firstName = item.person.first_name?.trim();
    const lastName = item.person.last_name?.trim();

    if (!firstName && !lastName) {
      throw new ApiError(400, "I need at least a first name and last name to add this person. What should I call them?");
    }

    if (!firstName) {
      throw new ApiError(400, "What is their first name?");
    }

    if (!lastName) {
      throw new ApiError(400, `And what is ${firstName}'s last name?`);
    }

    const payload = buildCreatePayload(persons, item.person);
    return personService.create(treeId, userId, payload);
  }

  if (item.action === 'UPDATE_PERSON') {
    if (!item.person || typeof item.person !== 'object' || Object.keys(item.person).length === 0) {
      throw new ApiError(400, "What would you like to update? Please tell me which fields to change and the new values.");
    }

    const targetName = item.target_name?.trim();
    if (!targetName) {
      throw new ApiError(400, 'Please specify which person to edit by name.');
    }

    const updatePayload = buildUpdatePayload(item.person);
    if (Object.keys(updatePayload).length === 0) {
      throw new ApiError(400, 'No fields were provided to update.');
    }

    const target = resolvePersonByName(persons, targetName);
    if (target.kind === 'not_found') {
      throw new ApiError(
        400,
        `Could not find anyone named "${targetName}" in this tree.`,
      );
    }
    if (target.kind === 'ambiguous') {
      throw new ApiError(
        400,
        `Multiple people match "${targetName}". Please be more specific.`,
      );
    }

    return personService.update(
      treeId,
      target.person.id,
      userId,
      updatePayload,
    );
  }

  if (item.action === 'ADD_SPOUSE') {
    if (!item.person) {
      throw new ApiError(400, 'Spouse details are required to add a spouse.');
    }

    const targetName = item.target_name?.trim();
    if (!targetName && !item.target_id) {
      throw new ApiError(400, 'Please specify which person to add a spouse to by name.');
    }

    let targetPerson = item.target_id
      ? persons.find((person) => person.id === item.target_id)
      : null;

    if (!targetPerson) {
      const target = resolvePersonByName(persons, targetName!);
      if (target.kind === 'not_found') {
        throw new ApiError(
          400,
          `Could not find anyone named "${targetName}" in this tree.`,
        );
      }
      if (target.kind === 'ambiguous') {
        throw new ApiError(
          400,
          `Multiple people match "${targetName}". Please be more specific.`,
        );
      }
      targetPerson = target.person;
    }

    const spouseDto = buildSpousePayload(
      persons,
      item.person,
      targetPerson.id,
    );
    return personService.addSpouse(
      treeId,
      targetPerson.id,
      userId,
      spouseDto,
    );
  }

  if (item.action === 'ADD_PARENT') {
    if (!item.person) {
      throw new ApiError(400, 'Parent details are required to add a parent.');
    }

    const targetName = item.target_name?.trim();
    if (!targetName) {
      throw new ApiError(400, 'Please specify which person to add a parent to by name.');
    }

    const target = resolvePersonByName(persons, targetName);
    if (target.kind === 'not_found') {
      throw new ApiError(
        400,
        `Could not find anyone named "${targetName}" in this tree.`,
      );
    }
    if (target.kind === 'ambiguous') {
      throw new ApiError(
        400,
        `Multiple people match "${targetName}". Please be more specific.`,
      );
    }

    const parentDto = buildParentPayload(item.person);
    return personService.addParent(
      treeId,
      target.person.id,
      userId,
      parentDto,
    );
  }

  throw new ApiError(400, 'Unsupported action.');
}

export async function executeChatActions(
  personRepo: Repository<Person>,
  personService: PersonService,
  treeId: string,
  userId: string,
  initialPersons: Person[],
  actions: AiActionItem[],
): Promise<{ results: ChatActionResult[]; persons: Person[] }> {
  let persons = initialPersons;
  const results: ChatActionResult[] = [];

  for (const item of actions) {
    try {
      const person = await applySingleAction(
        personService,
        treeId,
        userId,
        persons,
        item,
      );
      persons = await reloadPersons(personRepo, treeId);
      results.push({ action: item.action, person, success: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not apply that change.';
      results.push({
        action: item.action,
        person: null,
        success: false,
        error: message,
      });
    }
  }

  return { results, persons };
}

export function buildResultReply(
  aiReply: string,
  results: ChatActionResult[],
): string {
  const failures = results.filter((result) => !result.success);
  if (failures.length === 0) return aiReply;

  if (results.every((result) => !result.success)) {
    const errorMessages = failures
      .map((r) => r.error ?? 'Something went wrong with that change.')
      .join(' ');
    return errorMessages;
  }

  const errorLines = failures
    .map((result) => `- ${result.error ?? 'Unknown error'}`)
    .join('\n');

  return `${aiReply}\n\n(Some changes could not be applied:\n${errorLines})`;
}

export function summarizeChatAction(results: ChatActionResult[]): ChatAction {
  const successes = results.filter((result) => result.success);
  if (successes.length === 0) return 'NONE';
  if (successes.length > 1) return 'BATCH';

  return successes[0].action;
}

export function getLastAffectedPerson(
  results: ChatActionResult[],
): PersonResponse | null {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index].success && results[index].person) {
      return results[index].person;
    }
  }

  return null;
}
