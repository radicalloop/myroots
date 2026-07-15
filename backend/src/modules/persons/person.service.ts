import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Person } from '../../entities/Person';
import { PersonSpouse } from '../../entities/PersonSpouse';
import { ApiError } from '../../utils/ApiError';
import { Gender } from '../../types/common.types';
import { TreeService } from '../trees/tree.service';
import { S3Service } from '../storage/s3.service';
import {
  AddParentDto,
  AddSpouseDto,
  CreatePersonDto,
  UpdatePersonDto,
  ImageUploadDto,
  ConfirmImageUploadDto,
} from './dto/person.dto';
import {
  mapPersonToResponse,
  buildPersonTree,
  buildSpouseMap,
  buildSpouseNode,
  findRootPerson,
  TreeViewResponse,
  PersonResponse,
  TreePersonNode,
} from './helpers/person.mapper';
import {
  getAddParentDuplicateOptions,
  insertParentForPerson,
} from './helpers/person-parent.helper';
import {
  assertNoDuplicatePerson,
  findExistingRoot,
} from './helpers/person-validation.helper';
import { assertPersonDatesNotInFuture } from './helpers/person-date.helper';
import {
  addSpouseForPerson,
  removeSpouseForPerson,
} from './helpers/spouse.helper';

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(PersonSpouse)
    private readonly spouseRepo: Repository<PersonSpouse>,
    private readonly treeService: TreeService,
    private readonly s3Service: S3Service,
  ) {}

  async findAll(treeId: string, userId: string) {
    await this.treeService.getAccessibleTree(treeId, userId);

    const persons = await this.personRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });

    return persons.map(mapPersonToResponse);
  }

  async findOne(treeId: string, personId: string, userId: string) {
    const person = await this.getAccessiblePerson(treeId, personId, userId);
    return mapPersonToResponse(person);
  }

  async create(treeId: string, userId: string, dto: CreatePersonDto) {
    await this.assertEditPermission(treeId, userId);
    await this.validatePersonRules(treeId, dto.is_root, dto.parent_id ?? null);

    await assertNoDuplicatePerson(
      this.personRepo,
      treeId,
      dto.first_name,
      dto.last_name,
      {
        isRoot: dto.is_root,
        parentId: dto.is_root ? null : dto.parent_id ?? null,
      },
    );

    assertPersonDatesNotInFuture(dto.birth_date, dto.death_date);

    const person = this.personRepo.create({
      treeId,
      parentId: dto.is_root ? null : dto.parent_id ?? null,
      firstName: dto.first_name,
      lastName: dto.last_name,
      gender: dto.gender ?? Gender.MALE,
      birthDate: dto.birth_date ?? null,
      deathDate: dto.death_date ?? null,
      birthPlace: dto.birth_place ?? null,
      currentPlace: dto.current_place ?? null,
      healthNote: dto.health_note ?? null,
      isRoot: dto.is_root,
    });

    const saved = await this.personRepo.save(person);
    return mapPersonToResponse(saved);
  }

  async addParent(
    treeId: string,
    personId: string,
    userId: string,
    dto: AddParentDto,
  ) {
    await this.assertEditPermission(treeId, userId);
    const child = await this.getAccessiblePerson(treeId, personId, userId);

    await assertNoDuplicatePerson(
      this.personRepo,
      treeId,
      dto.first_name,
      dto.last_name,
      getAddParentDuplicateOptions(child),
    );

    assertPersonDatesNotInFuture(dto.birth_date, dto.death_date);

    const savedParent = await this.personRepo.manager.transaction(
      async (manager) =>
        insertParentForPerson(manager, {
          treeId,
          childId: personId,
          dto,
        }),
    );

    return mapPersonToResponse(savedParent);
  }

  async addSpouse(
    treeId: string,
    personId: string,
    userId: string,
    dto: AddSpouseDto,
  ) {
    await this.assertEditPermission(treeId, userId);
    await this.getAccessiblePerson(treeId, personId, userId);

    assertPersonDatesNotInFuture(dto.birth_date, dto.death_date);

    const savedSpouse = await this.personRepo.manager.transaction(
      async (manager) =>
        addSpouseForPerson(manager, {
          treeId,
          personId,
          dto,
        }),
    );

    return mapPersonToResponse(savedSpouse);
  }

  async removeSpouse(
    treeId: string,
    personId: string,
    userId: string,
  ) {
    await this.assertEditPermission(treeId, userId);
    await this.getAccessiblePerson(treeId, personId, userId);

    const removed = await this.personRepo.manager.transaction(
      async (manager) =>
        removeSpouseForPerson(manager, treeId, personId),
    );

    return removed;
  }

  async update(
    treeId: string,
    personId: string,
    userId: string,
    dto: UpdatePersonDto,
  ) {
    await this.assertEditPermission(treeId, userId);
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    const nextBirthDate =
      dto.birth_date !== undefined ? dto.birth_date : person.birthDate;
    const nextDeathDate =
      dto.death_date !== undefined ? dto.death_date : person.deathDate;
    assertPersonDatesNotInFuture(nextBirthDate, nextDeathDate);

    if (dto.first_name !== undefined) person.firstName = dto.first_name;
    if (dto.last_name !== undefined) person.lastName = dto.last_name;
    if (dto.gender !== undefined) person.gender = dto.gender;
    if (dto.birth_date !== undefined) person.birthDate = dto.birth_date ?? null;
    if (dto.death_date !== undefined) person.deathDate = dto.death_date ?? null;
    if (dto.birth_place !== undefined) person.birthPlace = dto.birth_place ?? null;
    if (dto.current_place !== undefined) {
      person.currentPlace = dto.current_place ?? null;
    }
    if (dto.health_note !== undefined) {
      person.healthNote = dto.health_note ?? null;
    }

    const saved = await this.personRepo.save(person);
    return mapPersonToResponse(saved);
  }

  async delete(
    treeId: string,
    personId: string,
    userId: string,
    mode: 'person' | 'branch' = 'person',
  ): Promise<void> {
    await this.assertEditPermission(treeId, userId);
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    if (person.profileImagePath) {
      try {
        await this.s3Service.deleteObject(person.profileImagePath);
      } catch {
        // Non-blocking: still soft-delete person
      }
    }

    await this.personRepo.manager.transaction(async (manager) => {
      const personRepo = manager.getRepository(Person);
      const spouseRepo = manager.getRepository(PersonSpouse);
      const now = new Date();
      const personToDelete = await personRepo.findOne({
        where: { id: personId, treeId, deletedAt: IsNull() },
      });

      if (!personToDelete) {
        throw new ApiError(404, 'Person not found');
      }

      if (mode === 'branch') {
        const persons = await personRepo.find({
          where: { treeId, deletedAt: IsNull() },
        });
        const idsToDelete = new Set<string>([personId]);
        let changed = true;

        while (changed) {
          changed = false;
          for (const item of persons) {
            if (
              item.parentId &&
              idsToDelete.has(item.parentId) &&
              !idsToDelete.has(item.id)
            ) {
              idsToDelete.add(item.id);
              changed = true;
            }
          }
        }

        const spouseLinks = await spouseRepo.find({
          where: { treeId, deletedAt: IsNull() },
        });

        await spouseRepo.save(
          spouseLinks
            .filter(
              (link) =>
                idsToDelete.has(link.personId) || idsToDelete.has(link.spouseId),
            )
            .map((link) => {
              link.deletedAt = now;
              return link;
            }),
        );

        await personRepo.save(
          persons
            .filter((item) => idsToDelete.has(item.id))
            .map((item) => {
              item.deletedAt = now;
              return item;
            }),
        );
        return;
      }

      // Soft-delete spouse links, but keep the surviving spouse visible.
      const spouseLinks = await spouseRepo.find({
        where: [
          { treeId, personId, deletedAt: IsNull() },
          { treeId, spouseId: personId, deletedAt: IsNull() },
        ],
      });

      const survivorId = spouseLinks
        .map((link) => (link.personId === personId ? link.spouseId : link.personId))
        .find(Boolean);
      let reparentTargetId = personToDelete.parentId;

      if (survivorId) {
        const survivor = await personRepo.findOne({
          where: { id: survivorId, treeId, deletedAt: IsNull() },
        });

        if (survivor) {
          if (personToDelete.isRoot) {
            survivor.isRoot = true;
            survivor.parentId = null;
          } else if (!survivor.parentId || survivor.parentId === personId) {
            survivor.parentId = personToDelete.parentId;
          }

          await personRepo.save(survivor);
          reparentTargetId = survivor.id;
        }
      }

      const children = await personRepo.find({
        where: { treeId, parentId: personId, deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
      });

      const childrenToMove = children.filter((child) => child.id !== survivorId);
      if (childrenToMove.length > 0) {
        if (personToDelete.isRoot && !reparentTargetId) {
          const [nextRoot, ...remainingChildren] = childrenToMove;
          nextRoot.parentId = null;
          nextRoot.isRoot = true;
          nextRoot.updatedAt = now;

          await personRepo.save([
            nextRoot,
            ...remainingChildren.map((child) => {
              child.parentId = nextRoot.id;
              child.updatedAt = now;
              return child;
            }),
          ]);
        } else {
          await personRepo.save(
            childrenToMove.map((child) => {
              child.parentId = reparentTargetId;
              child.updatedAt = now;
              return child;
            }),
          );
        }
      }

      if (spouseLinks.length > 0) {
        await spouseRepo.save(
          spouseLinks.map((link) => {
            link.deletedAt = now;
            return link;
          }),
        );
      }

      personToDelete.deletedAt = now;
      await personRepo.save(personToDelete);
    });
  }

  async getTreeView(treeId: string, userId: string): Promise<TreeViewResponse> {
    const { tree, permission } = await this.treeService.getAccessibleTree(treeId, userId);

    const persons = await this.personRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });

    // Fetch all spouse rows for the tree in one query (no N+1).
    const spouseRows = await this.spouseRepo.find({
      where: { treeId, deletedAt: IsNull() },
    });

    await this.cleanupStaleImagePaths(persons);

    const spousesMap = buildSpouseMap(persons, spouseRows);
    const rootPerson = findRootPerson(persons);
    const root = rootPerson
      ? await this.enrichPersonTree({
          ...mapPersonToResponse(rootPerson),
          spouse: buildSpouseNode(rootPerson.id, persons, spousesMap),
          children: buildPersonTree(persons, rootPerson.id, spousesMap),
        })
      : null;

    return {
      tree: { id: tree.id, name: tree.name, role: permission },
      root,
    };
  }

  async generateImageUploadUrl(
    treeId: string,
    personId: string,
    userId: string,
    dto: ImageUploadDto,
  ) {
    await this.assertEditPermission(treeId, userId);
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    if (dto.file_size && dto.file_size > this.s3Service.getMaxImageSizeBytes()) {
      throw new ApiError(400, 'File size exceeds maximum allowed');
    }

    const key = this.s3Service.buildProfileImageKey(
      treeId,
      personId,
      dto.content_type,
    );
    const { uploadUrl, objectPath } =
      await this.s3Service.generateUploadSignedUrl(key, dto.content_type);

    return {
      upload_url: uploadUrl,
      object_path: objectPath,
    };
  }

  async uploadPersonImageDirect(
    treeId: string,
    personId: string,
    userId: string,
    fileBuffer: Buffer,
    contentType: string,
  ) {
    this.s3Service.validateImageContentType(contentType);

    if (fileBuffer.length > this.s3Service.getMaxImageSizeBytes()) {
      throw new ApiError(400, 'File size exceeds maximum allowed');
    }

    if (fileBuffer.length === 0) {
      throw new ApiError(400, 'Image file is empty');
    }

    await this.assertEditPermission(treeId, userId);
    const person = await this.getAccessiblePerson(treeId, personId, userId);
    const key = this.s3Service.buildProfileImageKey(
      treeId,
      personId,
      contentType,
    );

    await this.s3Service.uploadObject(key, fileBuffer, contentType);

    if (person.profileImagePath && person.profileImagePath !== key) {
      try {
        await this.s3Service.deleteObject(person.profileImagePath);
      } catch {
        // Continue with new image path
      }
    }

    person.profileImagePath = key;
    await this.personRepo.save(person);

    return mapPersonToResponse(person);
  }

  async confirmImageUpload(
    treeId: string,
    personId: string,
    userId: string,
    dto: ConfirmImageUploadDto,
  ) {
    const expectedPrefix = `trees/${treeId}/persons/${personId}/`;

    if (!dto.object_path.startsWith(expectedPrefix)) {
      throw new ApiError(400, 'Invalid object path for this person');
    }

    const exists = await this.s3Service.objectExists(dto.object_path);
    if (!exists) {
      throw new ApiError(
        400,
        'Image file not found in storage. Please upload again.',
      );
    }

    await this.assertEditPermission(treeId, userId);
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    if (person.profileImagePath && person.profileImagePath !== dto.object_path) {
      try {
        await this.s3Service.deleteObject(person.profileImagePath);
      } catch {
        // Continue with new image path
      }
    }

    person.profileImagePath = dto.object_path;
    await this.personRepo.save(person);

    return mapPersonToResponse(person);
  }

  async streamPersonImage(
    treeId: string,
    personId: string,
    userId: string,
  ): Promise<{ body: NodeJS.ReadableStream; contentType: string }> {
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    if (!person.profileImagePath) {
      throw new ApiError(404, 'No profile image found');
    }

    const exists = await this.s3Service.objectExists(person.profileImagePath);
    if (!exists) {
      person.profileImagePath = null;
      await this.personRepo.save(person);
      throw new ApiError(404, 'Image file not found in storage');
    }

    return this.s3Service.getObjectStream(person.profileImagePath);
  }

  async getImageReadUrl(treeId: string, personId: string, userId: string) {
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    if (!person.profileImagePath) {
      throw new ApiError(404, 'No profile image found');
    }

    const exists = await this.s3Service.objectExists(person.profileImagePath);
    if (!exists) {
      person.profileImagePath = null;
      await this.personRepo.save(person);
      throw new ApiError(404, 'Image file not found in storage');
    }

    const image_url = await this.s3Service.generateReadSignedUrl(
      person.profileImagePath,
    );
    return { image_url };
  }

  async deleteImage(treeId: string, personId: string, userId: string) {
    await this.assertEditPermission(treeId, userId);
    const person = await this.getAccessiblePerson(treeId, personId, userId);

    if (!person.profileImagePath) {
      throw new ApiError(404, 'No profile image found');
    }

    try {
      await this.s3Service.deleteObject(person.profileImagePath);
    } catch {
      // Object may already be missing — still clear DB path
    }

    person.profileImagePath = null;
    await this.personRepo.save(person);

    return mapPersonToResponse(person);
  }

  private async enrichPersonTree(node: TreePersonNode): Promise<TreePersonNode> {
    const children = await Promise.all(
      node.children.map((child) => this.enrichPersonTree(child)),
    );

    return { ...node, children };
  }

  private async cleanupStaleImagePaths(persons: Person[]): Promise<void> {
    await Promise.all(
      persons.map(async (person) => {
        if (!person.profileImagePath) return;

        const exists = await this.s3Service.objectExists(person.profileImagePath);
        if (!exists) {
          person.profileImagePath = null;
          await this.personRepo.save(person);
        }
      }),
    );
  }

  private async getAccessiblePerson(
    treeId: string,
    personId: string,
    userId: string,
  ): Promise<Person> {
    await this.treeService.getAccessibleTree(treeId, userId);

    const person = await this.personRepo.findOne({
      where: { id: personId, treeId, deletedAt: IsNull() },
    });

    if (!person) {
      throw new ApiError(404, 'Person not found');
    }

    return person;
  }

  private async assertEditPermission(
    treeId: string,
    userId: string,
  ): Promise<void> {
    const { permission } = await this.treeService.getAccessibleTree(
      treeId,
      userId,
    );

    if (permission === 'VIEW') {
      throw new ApiError(
        403,
        'You do not have permission to modify this tree',
      );
    }
  }

  private async validatePersonRules(
    treeId: string,
    isRoot: boolean,
    parentId: string | null,
  ): Promise<void> {
    if (isRoot) {
      if (parentId) {
        throw new ApiError(400, 'Root person cannot have a parent_id');
      }

      const existingRoot = await findExistingRoot(this.personRepo, treeId);

      if (existingRoot) {
        throw new ApiError(422, 'Only one root person is allowed per tree');
      }
      return;
    }

    if (!parentId) {
      throw new ApiError(400, 'parent_id is required for non-root persons');
    }

    const parent = await this.personRepo.findOne({
      where: { id: parentId, treeId, deletedAt: IsNull() },
    });

    if (!parent) {
      throw new ApiError(400, 'Parent person must belong to the same tree');
    }
  }

  // ─── Public access (no auth required) ────────────────────────────────────

  async getPublicTreeView(treeId: string): Promise<TreeViewResponse> {
    const tree = await this.treeService.findTreeById(treeId);

    const persons = await this.personRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });

    const spouseRows = await this.spouseRepo.find({
      where: { treeId, deletedAt: IsNull() },
    });

    await this.cleanupStaleImagePaths(persons);

    const spousesMap = buildSpouseMap(persons, spouseRows);
    const rootPerson = findRootPerson(persons);
    const root = rootPerson
      ? await this.enrichPersonTree({
          ...mapPersonToResponse(rootPerson),
          spouse: buildSpouseNode(rootPerson.id, persons, spousesMap),
          children: buildPersonTree(persons, rootPerson.id, spousesMap),
        })
      : null;

    return {
      tree: { id: tree.id, name: tree.name, role: 'VIEW' as const },
      root,
    };
  }

  async getPublicPersonImageUrl(
    treeId: string,
    personId: string,
  ): Promise<{ image_url: string }> {
    const person = await this.personRepo.findOne({
      where: { id: personId, treeId, deletedAt: IsNull() },
    });

    if (!person?.profileImagePath) {
      throw new ApiError(404, 'No profile image found');
    }

    const exists = await this.s3Service.objectExists(person.profileImagePath);
    if (!exists) {
      person.profileImagePath = null;
      await this.personRepo.save(person);
      throw new ApiError(404, 'Image file not found in storage');
    }

    const imageUrl = await this.s3Service.generateReadSignedUrl(
      person.profileImagePath,
    );
    return { image_url: imageUrl };
  }

  async streamPublicPersonImage(
    treeId: string,
    personId: string,
  ): Promise<{ body: NodeJS.ReadableStream; contentType: string }> {
    const person = await this.personRepo.findOne({
      where: { id: personId, treeId, deletedAt: IsNull() },
    });

    if (!person?.profileImagePath) {
      throw new ApiError(404, 'No profile image found');
    }

    const exists = await this.s3Service.objectExists(person.profileImagePath);
    if (!exists) {
      person.profileImagePath = null;
      await this.personRepo.save(person);
      throw new ApiError(404, 'Image file not found in storage');
    }

    return this.s3Service.getObjectStream(person.profileImagePath);
  }
}
