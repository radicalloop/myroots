import { IsNull, Repository } from 'typeorm';
import { Person } from '../../../entities/Person';
import { ApiError } from '../../../utils/ApiError';

export interface DuplicateCheckOptions {
  isRoot: boolean;
  parentId: string | null;
}

export function normalizePersonNamePart(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findDuplicatePerson(
  persons: Person[],
  firstName: string,
  lastName: string,
  options: DuplicateCheckOptions,
): Person | null {
  const normFirst = normalizePersonNamePart(firstName);
  const normLast = normalizePersonNamePart(lastName);

  return (
    persons.find((person) => {
      const nameMatch =
        normalizePersonNamePart(person.firstName) === normFirst &&
        normalizePersonNamePart(person.lastName) === normLast;

      if (!nameMatch) return false;
      if (options.isRoot) return person.isRoot;
      return person.parentId === options.parentId;
    }) ?? null
  );
}

export function duplicatePersonMessage(
  firstName: string,
  lastName: string,
  options: DuplicateCheckOptions,
): string {
  const displayName = `${firstName.trim()} ${lastName.trim()}`;

  if (options.isRoot) {
    return `${displayName} already exists as the root person in this tree.`;
  }

  return `${displayName} is already listed under this parent.`;
}

export async function assertNoDuplicatePerson(
  personRepo: Repository<Person>,
  treeId: string,
  firstName: string,
  lastName: string,
  options: DuplicateCheckOptions,
): Promise<void> {
  const qb = personRepo
    .createQueryBuilder('person')
    .where('person.treeId = :treeId', { treeId })
    .andWhere('person.deletedAt IS NULL')
    .andWhere('LOWER(TRIM(person.firstName)) = LOWER(TRIM(:firstName))', {
      firstName,
    })
    .andWhere('LOWER(TRIM(person.lastName)) = LOWER(TRIM(:lastName))', {
      lastName,
    });

  if (options.isRoot) {
    qb.andWhere('person.isRoot = true');
  } else {
    qb.andWhere('person.parentId = :parentId', { parentId: options.parentId });
  }

  const existing = await qb.getOne();
  if (!existing) return;

  throw new ApiError(
    409,
    duplicatePersonMessage(firstName, lastName, options),
  );
}

export async function findExistingRoot(
  personRepo: Repository<Person>,
  treeId: string,
): Promise<Person | null> {
  return personRepo.findOne({
    where: { treeId, isRoot: true, deletedAt: IsNull() },
  });
}
