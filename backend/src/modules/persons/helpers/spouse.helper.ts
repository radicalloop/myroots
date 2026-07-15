import { EntityManager, IsNull } from 'typeorm';
import { Person } from '../../../entities/Person';
import { PersonSpouse } from '../../../entities/PersonSpouse';
import { Gender } from '../../../types/common.types';
import { ApiError } from '../../../utils/ApiError';
import { AddSpouseDto } from '../dto/person.dto';
import { mapPersonToResponse, PersonResponse } from './person.mapper';

export interface AddSpouseInput {
  treeId: string;
  personId: string;
  dto: AddSpouseDto;
}

export interface SpouseValidationInput {
  manager: EntityManager;
  treeId: string;
  personId: string;
  spouseId: string;
}

/**
 * Validates spouse relationship rules:
 * - person cannot be their own spouse
 * - both people must belong to the same tree
 * - neither person can already have an active spouse link
 */
export async function validateSpouseRules(
  input: SpouseValidationInput,
): Promise<void> {
  const { manager, treeId, personId, spouseId } = input;
  const personRepo = manager.getRepository(Person);
  const spouseRepo = manager.getRepository(PersonSpouse);

  if (personId === spouseId) {
    throw new ApiError(400, 'A person cannot be their own spouse');
  }

  const [person, spouse] = await Promise.all([
    personRepo.findOne({
      where: { id: personId, treeId, deletedAt: IsNull() },
    }),
    personRepo.findOne({
      where: { id: spouseId, treeId, deletedAt: IsNull() },
    }),
  ]);

  if (!person) {
    throw new ApiError(404, 'Person not found');
  }

  if (!spouse) {
    throw new ApiError(
      400,
      'Spouse person not found or does not belong to this tree',
    );
  }

  // Canonical ordering: the pair is always stored as (lower, higher) UUID.
  const [canonicalIdA, canonicalIdB] =
    personId < spouseId ? [personId, spouseId] : [spouseId, personId];

  const existingSpouseLink = await spouseRepo.findOne({
    where: {
      treeId,
      personId: canonicalIdA,
      spouseId: canonicalIdB,
      deletedAt: IsNull(),
    },
  });

  if (existingSpouseLink) {
    throw new ApiError(409, 'This person already has a spouse');
  }
}

/**
 * Creates or links a spouse for the given person, then creates the canonical join row.
 * Wraps person creation + join row creation in the provided transaction manager.
 */
export async function addSpouseForPerson(
  manager: EntityManager,
  input: AddSpouseInput,
): Promise<Person> {
  const personRepo = manager.getRepository(Person);
  const spouseRepo = manager.getRepository(PersonSpouse);

  let spousePerson: Person;

  if (input.dto.existing_person_id) {
    // Link an existing person as spouse
    await validateSpouseRules({
      manager,
      treeId: input.treeId,
      personId: input.personId,
      spouseId: input.dto.existing_person_id,
    });

    spousePerson = (await personRepo.findOne({
      where: {
        id: input.dto.existing_person_id,
        treeId: input.treeId,
        deletedAt: IsNull(),
      },
    }))!;
  } else {
    // Create a new person as the spouse
    spousePerson = personRepo.create({
      treeId: input.treeId,
      parentId: null,
      firstName: input.dto.first_name!,
      lastName: input.dto.last_name!,
      gender: input.dto.gender ?? Gender.MALE,
      birthDate: input.dto.birth_date ?? null,
      deathDate: input.dto.death_date ?? null,
      birthPlace: input.dto.birth_place ?? null,
      currentPlace: input.dto.current_place ?? null,
      healthNote: input.dto.health_note ?? null,
      isRoot: false,
    });

    spousePerson = await personRepo.save(spousePerson);

    // Now validate after creation (so the person exists)
    await validateSpouseRules({
      manager,
      treeId: input.treeId,
      personId: input.personId,
      spouseId: spousePerson.id,
    });
  }

  // Store the pair in canonical order (lower UUID first).
  const [personIdA, personIdB] =
    input.personId < spousePerson.id
      ? [input.personId, spousePerson.id]
      : [spousePerson.id, input.personId];

  const joinRow = spouseRepo.create({
    treeId: input.treeId,
    personId: personIdA,
    spouseId: personIdB,
  });

  await spouseRepo.save(joinRow);

  return spousePerson;
}

/**
 * Soft-deletes the spouse join row for the given person.
 * Does not touch either Person record.
 * Returns the removed spouse's mapped response, or null if no active link existed.
 */
export async function removeSpouseForPerson(
  manager: EntityManager,
  treeId: string,
  personId: string,
): Promise<PersonResponse | null> {
  const personRepo = manager.getRepository(Person);
  const spouseRepo = manager.getRepository(PersonSpouse);

  const person = await personRepo.findOne({
    where: { id: personId, treeId, deletedAt: IsNull() },
  });

  if (!person) {
    throw new ApiError(404, 'Person not found');
  }

  const link = await spouseRepo.findOne({
    where: [
      { treeId, personId, deletedAt: IsNull() },
      { treeId, spouseId: personId, deletedAt: IsNull() },
    ],
  });

  if (!link) {
    return null;
  }

  link.deletedAt = new Date();
  await spouseRepo.save(link);

  // Determine which side of the link is the spouse (not the querying person).
  const spouseId =
    link.personId === personId ? link.spouseId : link.personId;

  const spousePerson = await personRepo.findOne({
    where: { id: spouseId, treeId, deletedAt: IsNull() },
  });

  if (spousePerson) {
    const now = new Date();

    if (!spousePerson.parentId && !spousePerson.isRoot && person.parentId) {
      spousePerson.parentId = person.parentId;
      spousePerson.updatedAt = now;
      await personRepo.save(spousePerson);
    } else if (!person.parentId && !person.isRoot && spousePerson.parentId) {
      person.parentId = spousePerson.parentId;
      person.updatedAt = now;
      await personRepo.save(person);
    }
  }

  return spousePerson ? mapPersonToResponse(spousePerson) : null;
}

/**
 * Returns the spouse PersonResponse for the given person, or null if none.
 */
export async function getSpouseForPerson(
  manager: EntityManager,
  treeId: string,
  personId: string,
): Promise<PersonResponse | null> {
  const personRepo = manager.getRepository(Person);
  const spouseRepo = manager.getRepository(PersonSpouse);

  const link = await spouseRepo.findOne({
    where: [
      { treeId, personId, deletedAt: IsNull() },
      { treeId, spouseId: personId, deletedAt: IsNull() },
    ],
  });

  if (!link) return null;

  const spouseId =
    link.personId === personId ? link.spouseId : link.personId;

  const spousePerson = await personRepo.findOne({
    where: { id: spouseId, treeId, deletedAt: IsNull() },
  });

  return spousePerson ? mapPersonToResponse(spousePerson) : null;
}
