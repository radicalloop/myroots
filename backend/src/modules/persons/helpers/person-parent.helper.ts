import { EntityManager, IsNull } from 'typeorm';
import { Person } from '../../../entities/Person';
import { Gender } from '../../../types/common.types';
import { ApiError } from '../../../utils/ApiError';
import { AddParentDto } from '../dto/person.dto';

export interface AddParentInput {
  treeId: string;
  childId: string;
  dto: AddParentDto;
}

export async function insertParentForPerson(
  manager: EntityManager,
  input: AddParentInput,
): Promise<Person> {
  const repo = manager.getRepository(Person);
  const child = await repo.findOne({
    where: { id: input.childId, treeId: input.treeId, deletedAt: IsNull() },
  });

  if (!child) {
    throw new ApiError(404, 'Person not found');
  }

  const wasRoot = child.isRoot;
  const formerParentId = child.parentId;

  if (wasRoot) {
    child.isRoot = false;
    child.parentId = null;
    await repo.save(child);
  }

  const parent = repo.create({
    treeId: input.treeId,
    parentId: wasRoot ? null : formerParentId,
    firstName: input.dto.first_name,
    lastName: input.dto.last_name,
    gender: input.dto.gender ?? Gender.MALE,
    birthDate: input.dto.birth_date ?? null,
    deathDate: input.dto.death_date ?? null,
    birthPlace: input.dto.birth_place ?? null,
    currentPlace: input.dto.current_place ?? null,
    healthNote: input.dto.health_note ?? null,
    isRoot: wasRoot,
  });

  const savedParent = await repo.save(parent);

  child.parentId = savedParent.id;
  await repo.save(child);

  return savedParent;
}

export function getAddParentDuplicateOptions(child: Person) {
  return {
    isRoot: child.isRoot,
    parentId: child.isRoot ? null : child.parentId,
  };
}
