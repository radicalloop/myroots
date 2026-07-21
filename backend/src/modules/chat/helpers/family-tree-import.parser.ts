import { Gender } from '../../../types/common.types';
import { extractJsonFromAiResponse } from './chat.helper';
import {
  FamilyTreeImportSchema,
  ImportPersonRecord,
  ImportSchemaChildNode,
  ImportSchemaNode,
  ImportSchemaPersonRef,
} from '../types/family-tree-import.types';

export function parseImportSchemaFromMessage(
  message: string,
): FamilyTreeImportSchema | null {
  const trimmed = message.trim();
  const objectStart = trimmed.indexOf('{');
  const arrayStart = trimmed.indexOf('[');
  const jsonStart =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);
  if (jsonStart === -1) return null;

  const parsed = extractJsonFromAiResponse(trimmed.slice(jsonStart));
  if (!parsed || typeof parsed !== 'object') return null;

  if (Array.isArray(parsed)) {
    const firstNode = parsed.find(isImportLikeNode);
    if (!firstNode) return null;

    return {
      proband: normalizeImportLikeNode(firstNode, 'root'),
    };
  }

  const schema = parsed as Record<string, unknown>;
  if (!schema.proband || typeof schema.proband !== 'object') {
    if (!isImportLikeNode(schema)) return null;

    return {
      proband: normalizeImportLikeNode(schema, 'root'),
    };
  }

  return {
    schema_version:
      typeof schema.schema_version === 'string'
        ? schema.schema_version
        : undefined,
    proband: schema.proband as ImportSchemaNode,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isImportLikeNode(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.name === 'string' && value.name.trim().length > 0;
}

function normalizeExternalId(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);

  return fallback;
}

function normalizeImportLikeNode(
  value: Record<string, unknown>,
  fallbackId: string,
): ImportSchemaNode {
  const id = normalizeExternalId(value.id, fallbackId);
  const node: ImportSchemaNode = {
    id,
    name: value.name as string,
    gender: typeof value.gender === 'string' ? value.gender : undefined,
  };

  if (isImportLikeNode(value.spouse)) {
    node.spouse = normalizeImportLikeNode(value.spouse, `${id}:spouse`);
  }

  if (Array.isArray(value.children)) {
    node.children = value.children
      .filter(isImportLikeNode)
      .map((child, index) =>
        normalizeImportLikeNode(
          child,
          `${id}:child:${index}`,
        ) as ImportSchemaChildNode,
      );
  }

  return node;
}

export function splitImportName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, ' ');
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '-' };
  }

  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1),
  };
}

export function mapImportGender(value?: string): Gender {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'F' || normalized === 'FEMALE') return Gender.FEMALE;
  if (normalized === 'M' || normalized === 'MALE') return Gender.MALE;
  return Gender.OTHER;
}

function toRecord(
  person: ImportSchemaPersonRef,
  parentExternalId: string | null,
  isRoot: boolean,
  records: Map<string, ImportPersonRecord>,
  spouseOfExternalId: string | null = null,
): void {
  if (records.has(person.id)) return;

  const { firstName, lastName } = splitImportName(person.name);
  records.set(person.id, {
    externalId: person.id,
    firstName,
    lastName,
    gender: mapImportGender(person.gender),
    parentExternalId,
    spouseOfExternalId,
    isRoot,
  });
}

function parseAncestorChain(
  parents: ImportSchemaNode[] | undefined,
  childExternalId: string,
  records: Map<string, ImportPersonRecord>,
): void {
  if (!parents?.length) return;

  const parent = parents[0];
  parseAncestorChain(parent.parents, parent.id, records);

  const parentOfParent = parent.parents?.[0]?.id ?? null;
  toRecord(parent, parentOfParent, !parent.parents?.length, records);

  const existingChild = records.get(childExternalId);
  if (existingChild && !existingChild.parentExternalId) {
    existingChild.parentExternalId = parent.id;
    existingChild.isRoot = false;
  }
}

function parseUnassignedDescendants(
  unassigned: Record<string, ImportSchemaPersonRef[]>,
  anchorExternalId: string,
  records: Map<string, ImportPersonRecord>,
): void {
  const sortedGenerations = Object.keys(unassigned)
    .map(Number)
    .filter((generation) => !Number.isNaN(generation))
    .sort((left, right) => left - right);

  if (sortedGenerations.length === 0) return;

  const firstGeneration = sortedGenerations[0];
  let parentPool: string[] = [];

  for (const generation of sortedGenerations) {
    const people = unassigned[String(generation)] ?? [];
    const currentGenerationIds: string[] = [];

    if (generation === firstGeneration) {
      for (const person of people) {
        toRecord(person, anchorExternalId, false, records);
        currentGenerationIds.push(person.id);
      }

      const explicitSiblingIds = Array.from(records.values())
        .filter(
          (record) =>
            record.parentExternalId === anchorExternalId &&
            !currentGenerationIds.includes(record.externalId),
        )
        .map((record) => record.externalId);

      parentPool = [...explicitSiblingIds, ...currentGenerationIds];
      continue;
    }

    if (parentPool.length === 0) {
      parentPool = [anchorExternalId];
    }

    people.forEach((person, index) => {
      const parentExternalId = parentPool[index % parentPool.length];
      toRecord(person, parentExternalId, false, records);
      currentGenerationIds.push(person.id);
    });

    parentPool = currentGenerationIds;
  }
}

function parseChildBranch(
  children: ImportSchemaChildNode[] | undefined,
  parentExternalId: string,
  records: Map<string, ImportPersonRecord>,
): void {
  if (!children?.length) return;

  for (const child of children) {
    toRecord(child, parentExternalId, false, records);
    parseChildBranch(child.children, child.id, records);

    const unassigned = child.unassigned_descendants_by_generation;
    if (!unassigned) continue;

    parseUnassignedDescendants(unassigned, child.id, records);
  }
}

function parseSpouseBranch(
  person: ImportSchemaNode,
  records: Map<string, ImportPersonRecord>,
): void {
  if (!person.spouse) return;

  toRecord(person.spouse, null, false, records, person.id);
  parseChildBranch(person.spouse.children, person.id, records);
}

function parseSpouses(
  person: ImportSchemaNode,
  records: Map<string, ImportPersonRecord>,
): void {
  parseSpouseBranch(person, records);

  for (const child of person.children ?? []) {
    parseSpouses(child, records);
  }
}

export function parseImportRecords(
  schema: FamilyTreeImportSchema,
): ImportPersonRecord[] {
  const records = new Map<string, ImportPersonRecord>();
  const proband = schema.proband;

  toRecord(
    proband,
    proband.parents?.[0]?.id ?? null,
    !proband.parents?.length,
    records,
  );

  parseAncestorChain(proband.parents, proband.id, records);
  parseSpouseBranch(proband, records);
  parseChildBranch(proband.children, proband.id, records);
  parseSpouses(proband, records);

  return Array.from(records.values());
}

export function sortImportRecords(
  records: ImportPersonRecord[],
): ImportPersonRecord[] {
  const byId = new Map(records.map((record) => [record.externalId, record]));
  const sorted: ImportPersonRecord[] = [];
  const visited = new Set<string>();

  const visit = (externalId: string): void => {
    if (visited.has(externalId)) return;

    const record = byId.get(externalId);
    if (!record) return;

    if (
      record.spouseOfExternalId &&
      byId.has(record.spouseOfExternalId) &&
      record.spouseOfExternalId !== externalId
    ) {
      visit(record.spouseOfExternalId);
    }

    if (
      record.parentExternalId &&
      byId.has(record.parentExternalId) &&
      record.parentExternalId !== externalId
    ) {
      visit(record.parentExternalId);
    }

    visited.add(externalId);
    sorted.push(record);
  };

  for (const record of records) {
    visit(record.externalId);
  }

  return sorted;
}

export function countOtherRelatives(schema: FamilyTreeImportSchema): number {
  const proband = schema.proband as ImportSchemaNode & {
    other_relatives?: Record<string, ImportSchemaPersonRef[]>;
  };

  const groups = proband.other_relatives;
  if (!groups) return 0;

  return Object.values(groups).reduce(
    (total, people) => total + people.length,
    0,
  );
}
