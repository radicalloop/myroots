import { TreePersonNode } from '@/types/api.types';

export type PersonTreeUpdates = Partial<
  Pick<
    TreePersonNode,
    | 'first_name'
    | 'last_name'
    | 'gender'
    | 'birth_date'
    | 'death_date'
    | 'birth_place'
    | 'current_place'
    | 'profile_image_path'
  >
>;

export function formatPersonName(person: TreePersonNode): string {
  const lastName = person.last_name === '-' ? '' : person.last_name;
  return [person.first_name, lastName].filter(Boolean).join(' ').trim();
}

export function flattenPersons(root: TreePersonNode): TreePersonNode[] {
  const persons: TreePersonNode[] = [];
  const visited = new Set<string>();

  const walk = (node: TreePersonNode): void => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    persons.push(node);

    if (node.spouse && !visited.has(node.spouse.id)) {
      visited.add(node.spouse.id);
      persons.push(node.spouse);
    }

    node.children.forEach(walk);
  };

  walk(root);
  return persons;
}

export function findPersonInTree(
  root: TreePersonNode,
  personId: string,
): TreePersonNode | null {
  if (root.id === personId) return root;
  if (root.spouse?.id === personId) return root.spouse;

  for (const child of root.children) {
    const found = findPersonInTree(child, personId);
    if (found) return found;
  }

  return null;
}

export function getFamilyChildrenForPerson(
  root: TreePersonNode,
  person: TreePersonNode,
): TreePersonNode[] {
  const parentIds = new Set([person.id]);

  if (person.spouse?.id) {
    parentIds.add(person.spouse.id);
  }

  const children = flattenPersons(root).filter((candidate) =>
    candidate.parent_id ? parentIds.has(candidate.parent_id) : false,
  );
  const seen = new Set<string>();

  return children.filter((child) => {
    if (seen.has(child.id)) return false;
    seen.add(child.id);
    return true;
  });
}

export function updatePersonInTree(
  root: TreePersonNode,
  personId: string,
  updates: PersonTreeUpdates,
): TreePersonNode {
  if (root.id === personId) {
    return { ...root, ...updates };
  }

  const updatedChildren = root.children.map((child) =>
    updatePersonInTree(child, personId, updates),
  );
  const updatedSpouse =
    root.spouse?.id === personId ? { ...root.spouse, ...updates } : root.spouse;

  if (updatedSpouse !== root.spouse || updatedChildren !== root.children) {
    return { ...root, spouse: updatedSpouse, children: updatedChildren };
  }

  return root;
}

export function personToTreeUpdates(
  person: Pick<
    TreePersonNode,
    | 'first_name'
    | 'last_name'
    | 'gender'
    | 'birth_date'
    | 'death_date'
    | 'birth_place'
    | 'current_place'
    | 'profile_image_path'
  >,
): PersonTreeUpdates {
  return {
    first_name: person.first_name,
    last_name: person.last_name,
    gender: person.gender,
    birth_date: person.birth_date,
    death_date: person.death_date,
    birth_place: person.birth_place,
    current_place: person.current_place,
    profile_image_path: person.profile_image_path,
  };
}
