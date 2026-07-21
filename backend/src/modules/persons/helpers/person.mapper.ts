import { Person } from '../../../entities/Person';
import { PersonSpouse } from '../../../entities/PersonSpouse';
import { Tree } from '../../../entities/Tree';
import { Gender } from '../../../types/common.types';
import { Logger } from '@nestjs/common';

const logger = new Logger('PersonMapper');

export interface PersonResponse {
  id: string;
  tree_id: string;
  parent_id: string | null;
  first_name: string;
  last_name: string;
  gender: string;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  current_place: string | null;
  health_note: string | null;
  profile_image_path: string | null;
  profile_image_url?: string | null;
  is_root: boolean;
  spouse: PersonResponse | null;
  created_at: Date;
  updated_at: Date;
}

export interface TreePersonNode extends PersonResponse {
  children: TreePersonNode[];
  spouse: TreePersonNode | null;
}

export interface TreeResponse {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  counts?: {
    men: number;
    women: number;
    total: number;
  };
  role?: 'OWNER' | 'VIEW' | 'EDIT';
  created_at: Date;
  updated_at: Date;
}

export interface TreeViewResponse {
  tree: Pick<TreeResponse, 'id' | 'name' | 'description'> & {
    role?: 'OWNER' | 'VIEW' | 'EDIT';
  };
  root: TreePersonNode | null;
}

export function mapPersonToResponse(person: Person): PersonResponse {
  return {
    id: person.id,
    tree_id: person.treeId,
    parent_id: person.parentId,
    first_name: person.firstName,
    last_name: person.lastName,
    gender: person.gender,
    birth_date: person.birthDate,
    death_date: person.deathDate,
    birth_place: person.birthPlace,
    current_place: person.currentPlace,
    health_note: person.healthNote,
    profile_image_path: person.profileImagePath,
    is_root: person.isRoot,
    spouse: null,
    created_at: person.createdAt,
    updated_at: person.updatedAt,
  };
}

export function mapTreeToResponse(tree: Tree): TreeResponse {
  return {
    id: tree.id,
    user_id: tree.userId,
    name: tree.name,
    description: tree.description,
    created_at: tree.createdAt,
    updated_at: tree.updatedAt,
  };
}

export function mapTreeToViewSummary(
  tree: Tree,
  role?: 'OWNER' | 'VIEW' | 'EDIT',
): TreeViewResponse['tree'] {
  return {
    id: tree.id,
    name: tree.name,
    description: tree.description,
    ...(role ? { role } : {}),
  };
}

/**
 * Builds a map: personId → spouse PersonResponse.
 * The join table stores the pair canonically (person_id < spouse_id),
 * so we search both columns to resolve the spouse for either side.
 */
export function buildSpouseMap(
  persons: Person[],
  spouseRows: PersonSpouse[],
): Map<string, PersonResponse> {
  const personMap = new Map(
    persons.map((p) => [p.id, mapPersonToResponse(p)]),
  );
  const spouseMap = new Map<string, PersonResponse>();

  for (const row of spouseRows) {
    const spouseA = personMap.get(row.personId);
    const spouseB = personMap.get(row.spouseId);
    if (spouseA && spouseB) {
      // Both directions: spouse_map[A] = B, spouse_map[B] = A
      if (!spouseMap.has(row.personId)) {
        spouseMap.set(row.personId, spouseB);
      }
      if (!spouseMap.has(row.spouseId)) {
        spouseMap.set(row.spouseId, spouseA);
      }
    }
  }

  return spouseMap;
}

/**
 * Builds the tree from persons and spouse data.
 *
 * Children are attached to the "canonical parent" of a couple:
 * When a person has a spouse, children whose parent_id points to
 * either member are collected under this person's children array.
 * The spouse is attached as a reference (TreePersonNode.spouse)
 * and is NOT independently expanded as a subtree — its children
 * are already merged into the canonical parent's children.
 *
 * A visited set guards against circular parent chains;
 * duplicates or cycles are logged as warnings and skipped.
 */
export function buildPersonTree(
  persons: Person[],
  parentId: string | null,
  spousesMap: Map<string, PersonResponse>,
  visited: Set<string> = new Set(),
): TreePersonNode[] {
  const matching = persons.filter(
    (p) => p.parentId === parentId && !visited.has(p.id),
  );

  return matching.map((person) =>
    buildPersonTreeNode(person, persons, spousesMap, visited),
  );
}

export function buildPersonChildren(
  person: Person,
  persons: Person[],
  spousesMap: Map<string, PersonResponse>,
  visited: Set<string>,
): TreePersonNode[] {
  const childParentIds = new Set<string>([person.id]);
  const spouseResponse = spousesMap.get(person.id);

  if (spouseResponse) {
    childParentIds.add(spouseResponse.id);
  }

  return persons
    .filter(
      (candidate) =>
        Boolean(candidate.parentId) &&
        childParentIds.has(candidate.parentId!) &&
        !visited.has(candidate.id),
    )
    .map((child) => buildPersonTreeNode(child, persons, spousesMap, visited));
}

function buildPersonTreeNode(
  person: Person,
  persons: Person[],
  spousesMap: Map<string, PersonResponse>,
  visited: Set<string>,
): TreePersonNode {
  if (visited.has(person.id)) {
    logger.warn(
      `Cycle detected: person ${person.id} already visited — skipping subtree`,
    );
    return {
      ...mapPersonToResponse(person),
      spouse: null,
      children: [],
    };
  }

  visited.add(person.id);

  return {
    ...mapPersonToResponse(person),
    spouse: buildSpouseNode(person.id, persons, spousesMap),
    children: buildPersonChildren(person, persons, spousesMap, visited),
  };
}

/**
 * Builds a spouse TreePersonNode for the given person.
 * The spouse node is shallow (children: []) because its children
 * are already merged into the canonical parent's children array.
 */
export function buildSpouseNode(
  personId: string,
  persons: Person[],
  spousesMap: Map<string, PersonResponse>,
): TreePersonNode | null {
  const spouseResponse = spousesMap.get(personId);
  if (!spouseResponse) return null;

  const spouseEntity = persons.find((p) => p.id === spouseResponse.id);
  if (!spouseEntity) return null;

  const spouseOfSpouse = spousesMap.get(spouseEntity.id);

  return {
    ...mapPersonToResponse(spouseEntity),
    spouse: spouseOfSpouse
      ? ({
          ...spouseOfSpouse,
          children: [],
          spouse: null,
        } as TreePersonNode)
      : null,
    children: [],
  };
}

export function findRootPerson(persons: Person[]): Person | undefined {
  return persons.find((p) => p.isRoot);
}

export function countVisibleTreePeople(
  persons: Person[],
  spouseRows: PersonSpouse[],
): { men: number; women: number; total: number } {
  const counts = { men: 0, women: 0, total: 0 };
  const rootPerson = findRootPerson(persons);
  if (!rootPerson) return counts;

  const personById = new Map(persons.map((person) => [person.id, person]));
  const spouseByPersonId = new Map<string, string>();
  const visited = new Set<string>();

  for (const row of spouseRows) {
    if (personById.has(row.personId) && personById.has(row.spouseId)) {
      spouseByPersonId.set(row.personId, row.spouseId);
      spouseByPersonId.set(row.spouseId, row.personId);
    }
  }

  const countPerson = (person: Person): void => {
    if (visited.has(person.id)) return;
    visited.add(person.id);
    counts.total += 1;

    if (person.gender === Gender.MALE) {
      counts.men += 1;
    } else if (person.gender === Gender.FEMALE) {
      counts.women += 1;
    }
  };

  const visitFamily = (person: Person): void => {
    if (visited.has(person.id)) return;

    countPerson(person);

    const spouseId = spouseByPersonId.get(person.id);
    const spouse = spouseId ? personById.get(spouseId) : null;
    if (spouse) {
      countPerson(spouse);
    }

    const childParentIds = new Set<string>([person.id]);
    if (spouseId) childParentIds.add(spouseId);

    for (const child of persons) {
      if (
        child.parentId &&
        childParentIds.has(child.parentId) &&
        !visited.has(child.id)
      ) {
        visitFamily(child);
      }
    }
  };

  visitFamily(rootPerson);
  return counts;
}
