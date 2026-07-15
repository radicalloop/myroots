import { Person } from '../../../entities/Person';
import { ApiError } from '../../../utils/ApiError';
import {
  duplicatePersonMessage,
  findDuplicatePerson,
} from '../../persons/helpers/person-validation.helper';
import {
  CreatePersonDto,
  UpdatePersonDto,
  AddSpouseDto,
  AddParentDto,
} from '../../persons/dto/person.dto';
import { Gender } from '../../../types/common.types';

export interface AiPersonFields {
  first_name?: string;
  last_name?: string;
  gender?: string;
  birth_date?: string | null;
  death_date?: string | null;
  birth_place?: string | null;
  current_place?: string | null;
  health_note?: string | null;
  parent_name?: string | null;
  profile_image?: boolean;
  spouse_name?: string;
}

type NameResolution =
  | { kind: 'found'; person: Person }
  | { kind: 'not_found' }
  | { kind: 'ambiguous'; matches: Person[] };

export function formatPersonName(person: Person): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findUniqueMatch(
  persons: Person[],
  predicate: (person: Person) => boolean,
): NameResolution | null {
  const matches = persons.filter(predicate);
  if (matches.length === 1) return { kind: 'found', person: matches[0] };
  if (matches.length > 1) return { kind: 'ambiguous', matches };
  return null;
}

function parseGenderHint(
  name: string,
): { cleanName: string; genderFilter: string | null } {
  const match = name.match(/^(.+?)\s*\(\s*(MALE|FEMALE)\s*\)$/i);
  if (match) {
    return {
      cleanName: match[1].trim(),
      genderFilter: match[2].toUpperCase(),
    };
  }
  return { cleanName: name, genderFilter: null };
}

function tryResolve(
  persons: Person[],
  name: string,
  matchFn: (person: Person) => boolean,
): NameResolution | null {
  const result = findUniqueMatch(persons, matchFn);
  if (!result) return null;

  if (result.kind === 'found') return result;

  if (result.kind === 'ambiguous') {
    const { genderFilter } = parseGenderHint(name);
    if (genderFilter && result.matches.length > 1) {
      const gendered = result.matches.filter(
        (p: Person) => p.gender.toUpperCase() === genderFilter,
      );
      if (gendered.length === 1) return { kind: 'found', person: gendered[0] };
      if (gendered.length > 1) return { kind: 'ambiguous', matches: gendered };
    }
  }

  return result;
}

export function resolvePersonByName(
  persons: Person[],
  name: string,
): NameResolution {
  const { cleanName, genderFilter } = parseGenderHint(name);
  const normalized = normalizeName(cleanName);

  const exact = tryResolve(
    persons,
    name,
    (person) => normalizeName(formatPersonName(person)) === normalized,
  );
  if (exact) return exact;

  const firstName = tryResolve(
    persons,
    name,
    (person) => normalizeName(person.firstName) === normalized,
  );
  if (firstName) return firstName;

  const prefix = tryResolve(persons, name, (person) => {
    const fullName = normalizeName(formatPersonName(person));
    return fullName.startsWith(`${normalized} `);
  });
  if (prefix) return prefix;

  // If still not found but gender hint was present, try without the hint
  if (genderFilter) {
    return resolvePersonByName(persons, cleanName);
  }

  return { kind: 'not_found' };
}

/** Destructive action names the AI might accidentally emit — these are never allowed. */
const DESTRUCTIVE_ACTION_NAMES = [
  'DELETE_PERSON',
  'DELETE_TREE',
  'REMOVE_PERSON',
  'REMOVE_TREE',
  'CLEAR_TREE',
  'DELETE',
  'REMOVE',
  'CLEAR',
  'DESTROY',
  'ERASE',
];

/**
 * Checks a raw AI output string for destructive action names.
 * Returns the matched action name or null.
 */
export function detectDestructiveAction(raw: string): string | null {
  const lower = raw.toLowerCase();
  for (const action of DESTRUCTIVE_ACTION_NAMES) {
    if (lower.includes(action.toLowerCase())) {
      return action;
    }
  }
  return null;
}

/**
 * Detects if a user message is clearly a destructive command
 * (delete/remove/clear a person, member, or tree).
 * Returns true only for unambiguous destructive commands — not questions or field updates.
 */
export function isDestructiveCommand(message: string): boolean {
  const trimmed = message.trim().toLowerCase();

  // Skip questions — these are not commands
  if (/^(can\s|how\s|is\sit|what\s|where\s|who\s|when\s|why\s|do\s|does\s|will\s|would\s|should\s|could\s|have\s|has\s|did\s)/.test(trimmed)) {
    return false;
  }

  // Skip IF / hypotheticals
  if (/^(if\s|what if\s|unless\s)/.test(trimmed)) {
    return false;
  }

  // Clear patterns: "delete/remove/clear the tree", "delete/remove this tree", etc.
  if (/\b(delete|remove|clear|destroy|erase)\s+(the\s+)?(tree|family tree|entire tree|whole tree|this tree)\b/.test(trimmed)) {
    return true;
  }

  // Clear patterns: "remove/delete <name> from the tree/family tree"
  if (/\b(delete|remove)\s+.+?\s+from\s+(the\s+)?(tree|family tree)\b/.test(trimmed)) {
    return true;
  }

  // Direct commands with person reference: "remove Smith", "remove John Doe", "delete Smith"
  // But exclude field-update patterns like "remove the birth date", "remove health note"
  if (/^(delete|remove)\s+(the\s+)?\w+/.test(trimmed)) {
    // Check it's not a field update command
    const fieldUpdatePatterns = [
      /\b(birth|death|health|note|date|place|photo|image|picture|name|first|last|gender)\b/,
    ];
    const isFieldUpdate = fieldUpdatePatterns.some((p) => p.test(trimmed));
    if (!isFieldUpdate) {
      return true;
    }
  }

  // "clear all people", "clear the tree", "clear everyone"
  if (/\b(clear|remove|delete|wipe)\s+(all\s+)?(people|persons|members|everyone|everything|data|entries|records)\b/.test(trimmed)) {
    return true;
  }

  return false;
}

export function extractJsonFromAiResponse(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strategy 1: Extract JSON from code fences anywhere in the text.
  // The non-greedy [\s\S]*? ensures we only match the first fence block.
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    const inner = fenceMatch[1].trim();
    try {
      return JSON.parse(inner);
    } catch {
      // Fall through to next strategy.
    }
  }

  // Strategy 2: The entire trimmed string is clean JSON.
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through.
  }

  // Strategy 3: Balanced brace matching — find the first '{' and its
  // matching '}', ignoring text before and after. This correctly handles
  // nested objects (unlike lastIndexOf('}')).
  const objStart = trimmed.indexOf('{');
  if (objStart !== -1) {
    let depth = 0;
    for (let i = objStart; i < trimmed.length; i++) {
      if (trimmed[i] === '{') depth++;
      if (trimmed[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(trimmed.slice(objStart, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
}

export function toPersonSummaries(persons: Person[]) {
  const byId = new Map(persons.map((person) => [person.id, person]));

  return persons.map((person) => {
    const parent = person.parentId ? byId.get(person.parentId) : null;

    return {
      first_name: person.firstName,
      last_name: person.lastName,
      gender: person.gender,
      birth_date: person.birthDate,
      death_date: person.deathDate,
      birth_place: person.birthPlace,
      current_place: person.currentPlace,
      health_note: person.healthNote,
      is_root: person.isRoot,
      parent_name: parent ? formatPersonName(parent) : null,
      children_names: persons
        .filter((p) => p.parentId === person.id)
        .map((p) => formatPersonName(p)),
    };
  });
}

export function buildCreatePayload(
  persons: Person[],
  aiPerson: AiPersonFields,
): CreatePersonDto {
  const firstName = aiPerson.first_name?.trim();
  const lastName = aiPerson.last_name?.trim();

  if (!firstName || !lastName) {
    throw new ApiError(400, 'I need both a first name and last name to add this person. What should I call them?');
  }

  const base = {
    first_name: firstName,
    last_name: lastName,
    gender: aiPerson.gender as Gender | undefined,
    birth_date: normalizeDate(aiPerson.birth_date),
    death_date: normalizeDate(aiPerson.death_date),
    birth_place: aiPerson.birth_place ?? null,
    current_place: aiPerson.current_place ?? null,
    health_note: aiPerson.health_note ?? null,
  };

  if (persons.length === 0) {
    return { ...base, is_root: true, parent_id: null };
  }

  const parentName = aiPerson.parent_name?.trim();
  if (!parentName) {
    throw new ApiError(400, "Please specify the parent's name from the existing tree.");
  }

  const parent = resolvePersonByName(persons, parentName);
  if (parent.kind === 'not_found') {
    throw new ApiError(
      400,
      `Could not find anyone named "${parentName}" in this tree.`,
    );
  }
  if (parent.kind === 'ambiguous') {
    throw new ApiError(
      400,
      `Multiple people match "${parentName}". Please be more specific.`,
    );
  }

  const duplicateOptions = { isRoot: false, parentId: parent.person.id };
  if (findDuplicatePerson(persons, firstName, lastName, duplicateOptions)) {
    throw new ApiError(
      409,
      duplicatePersonMessage(firstName, lastName, duplicateOptions),
    );
  }

  return { ...base, is_root: false, parent_id: parent.person.id };
}

export function buildUpdatePayload(
  aiPerson: AiPersonFields,
): UpdatePersonDto {
  const payload: UpdatePersonDto = {};

  if (aiPerson.first_name !== undefined) payload.first_name = aiPerson.first_name;
  if (aiPerson.last_name !== undefined) payload.last_name = aiPerson.last_name;
  if (aiPerson.gender !== undefined) payload.gender = aiPerson.gender as Gender;
  if (aiPerson.birth_date !== undefined) payload.birth_date = normalizeDate(aiPerson.birth_date);
  if (aiPerson.death_date !== undefined) payload.death_date = normalizeDate(aiPerson.death_date);
  if (aiPerson.birth_place !== undefined) payload.birth_place = aiPerson.birth_place;
  if (aiPerson.current_place !== undefined) {
    payload.current_place = aiPerson.current_place;
  }
  if (aiPerson.health_note !== undefined) {
    payload.health_note = aiPerson.health_note;
  }

  return payload;
}

export function buildSpousePayload(
  persons: Person[],
  aiPerson: AiPersonFields,
  targetPersonId: string,
): AddSpouseDto {
  const spouseName = aiPerson.spouse_name?.trim();

  if (spouseName) {
    const spouse = resolvePersonByName(persons, spouseName);
    if (spouse.kind === 'not_found') {
      throw new ApiError(
        400,
        `Could not find anyone named "${spouseName}" in this tree.`,
      );
    }
    if (spouse.kind === 'ambiguous') {
      throw new ApiError(
        400,
        `Multiple people match "${spouseName}". Please be more specific.`,
      );
    }

    if (spouse.person.id === targetPersonId) {
      throw new ApiError(400, 'A person cannot be their own spouse');
    }

    return { existing_person_id: spouse.person.id };
  }

  const firstName = aiPerson.first_name?.trim();
  const lastName = aiPerson.last_name?.trim();

  if (!firstName || !lastName) {
    throw new ApiError(
      400,
      'First name and last name are required to add a spouse.',
    );
  }

  return {
    first_name: firstName,
    last_name: lastName,
    gender: aiPerson.gender as Gender | undefined,
    birth_date: normalizeDate(aiPerson.birth_date),
    death_date: normalizeDate(aiPerson.death_date),
    birth_place: aiPerson.birth_place ?? null,
    current_place: aiPerson.current_place ?? null,
    health_note: aiPerson.health_note ?? null,
  };
}

export function buildParentPayload(aiPerson: AiPersonFields): AddParentDto {
  const firstName = aiPerson.first_name?.trim();
  const lastName = aiPerson.last_name?.trim();

  if (!firstName || !lastName) {
    throw new ApiError(
      400,
      'First name and last name are required to add a parent.',
    );
  }

  return {
    first_name: firstName,
    last_name: lastName,
    gender: aiPerson.gender as Gender | undefined,
    birth_date: normalizeDate(aiPerson.birth_date),
    death_date: normalizeDate(aiPerson.death_date),
    birth_place: aiPerson.birth_place ?? null,
    current_place: aiPerson.current_place ?? null,
    health_note: aiPerson.health_note ?? null,
  };
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value || value === null) return null;

  const trimmed = value.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [_, year, month, day] = isoMatch;
    const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (d instanceof Date && !isNaN(d.getTime())) {
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  const parsed = new Date(trimmed);
  if (parsed instanceof Date && !isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}
