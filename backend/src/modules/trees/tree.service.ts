import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Tree } from '../../entities/Tree';
import { User } from '../../entities/User';
import { TreeShare, TreeSharePermission, TreeShareStatus } from '../../entities/TreeShare';
import { ApiError } from '../../utils/ApiError';
import { CreateTreeDto, UpdateTreeDto } from './dto/tree.dto';
import { CreateTreeShareDto, UpdateTreeShareDto } from './dto/share-tree.dto';
import { mapTreeToResponse } from '../persons/helpers/person.mapper';
import { ShareEmailService } from './share-email.service';
import { v4 as uuidv4 } from 'uuid';

export interface AccessibleTree {
  tree: Tree;
  permission: 'OWNER' | TreeSharePermission;
}

@Injectable()
export class TreeService {
  constructor(
    @InjectRepository(Tree)
    private readonly treeRepo: Repository<Tree>,
    @InjectRepository(TreeShare)
    private readonly treeShareRepo: Repository<TreeShare>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly shareEmailService: ShareEmailService,
  ) {}

  async findAllByUser(userId: string) {
    const ownedTrees = await this.treeRepo.find({
      where: { userId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    const acceptedShares = await this.treeShareRepo.find({
      where: { sharedWithUserId: userId, status: TreeShareStatus.ACCEPTED, deletedAt: IsNull() },
      relations: ['sharedByUser'],
    });

    const sharedTreeIds = acceptedShares.map((s) => s.treeId);

    let sharedTreeMap = new Map<string, Tree>();

    if (sharedTreeIds.length > 0) {
      const sharedTrees = await this.treeRepo.find({
        where: { id: In(sharedTreeIds), deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });
      sharedTreeMap = new Map(sharedTrees.map((t) => [t.id, t]));
    }

    const ownedResults = ownedTrees.map((tree) => ({
      ...mapTreeToResponse(tree),
      role: 'OWNER' as const,
    }));

    const sharedResults = acceptedShares
      .map((share) => {
        const tree = sharedTreeMap.get(share.treeId);
        if (!tree) return null;
        return {
          ...mapTreeToResponse(tree),
          role: share.permission as 'VIEW' | 'EDIT',
          sharedByEmail: share.sharedByUser?.email,
        };
      })
      .filter(Boolean);

    return [...ownedResults, ...sharedResults];
  }

  async findOne(treeId: string, userId: string) {
    const { tree, permission } = await this.getAccessibleTree(treeId, userId);
    return { ...mapTreeToResponse(tree), role: permission };
  }

  async findTreeById(treeId: string): Promise<Tree> {
    const tree = await this.treeRepo.findOne({
      where: { id: treeId, deletedAt: IsNull() },
    });

    if (!tree) {
      throw new ApiError(404, 'Tree not found');
    }

    return tree;
  }

  async create(userId: string, dto: CreateTreeDto) {
    const tree = this.treeRepo.create({
      userId,
      name: dto.name,
      description: dto.description ?? null,
    });

    const saved = await this.treeRepo.save(tree);
    return mapTreeToResponse(saved);
  }

  async update(treeId: string, userId: string, dto: UpdateTreeDto) {
    const { tree, permission } = await this.getAccessibleTree(treeId, userId);

    if (permission === 'VIEW') {
      throw new ApiError(403, 'You do not have permission to edit this tree');
    }

    if (dto.name !== undefined) tree.name = dto.name;
    if (dto.description !== undefined) {
      tree.description = dto.description ?? null;
    }

    const saved = await this.treeRepo.save(tree);
    return mapTreeToResponse(saved);
  }

  async delete(treeId: string, userId: string): Promise<void> {
    const tree = await this.getOwnedTree(treeId, userId);
    tree.deletedAt = new Date();
    await this.treeRepo.save(tree);
  }

  async getOwnedTree(treeId: string, userId: string): Promise<Tree> {
    const tree = await this.treeRepo.findOne({
      where: { id: treeId, userId, deletedAt: IsNull() },
    });

    if (!tree) {
      throw new ApiError(404, 'Tree not found');
    }

    return tree;
  }

  async getAccessibleTree(
    treeId: string,
    userId: string,
  ): Promise<AccessibleTree> {
    const tree = await this.treeRepo.findOne({
      where: { id: treeId, deletedAt: IsNull() },
    });

    if (!tree) {
      throw new ApiError(404, 'Tree not found');
    }

    if (tree.userId === userId) {
      return { tree, permission: 'OWNER' };
    }

    const share = await this.treeShareRepo.findOne({
      where: {
        treeId,
        sharedWithUserId: userId,
        status: TreeShareStatus.ACCEPTED,
        deletedAt: IsNull(),
      },
    });

    if (share) {
      return { tree, permission: share.permission };
    }

    throw new ApiError(404, 'Tree not found');
  }

  // ─── Share management ────────────────────────────────────────────────────

  async createShare(
    treeId: string,
    userId: string,
    dto: CreateTreeShareDto,
  ) {
    const tree = await this.getOwnedTree(treeId, userId);
    const sharedWithEmail = dto.sharedWithEmail.trim().toLowerCase();

    const currentUser = await this.userRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
    });

    if (
      currentUser &&
      currentUser.email.toLowerCase() === sharedWithEmail
    ) {
      throw new ApiError(400, 'You cannot share a tree with yourself');
    }

    const existing = await this.treeShareRepo.findOne({
      where: {
        treeId,
        sharedWithEmail,
        status: In([TreeShareStatus.PENDING, TreeShareStatus.ACCEPTED]),
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      throw new ApiError(409, 'A share invite already exists for this email');
    }

    const share = this.treeShareRepo.create({
      treeId: tree.id,
      sharedByUserId: userId,
      sharedWithEmail,
      permission: dto.permission,
      status: TreeShareStatus.PENDING,
      sharedWithUserId: null,
      token: uuidv4(),
    });

    const saved = await this.treeShareRepo.save(share);
    const emailSent = await this.shareEmailService.sendTreeShareInvite({
      to: saved.sharedWithEmail,
      treeName: tree.name,
      sharedByEmail: currentUser?.email ?? 'A MyRoots user',
      permission: saved.permission,
      acceptUrl: this.shareEmailService.getAcceptShareUrl(saved.token),
    });

    if (!emailSent) {
      saved.deletedAt = new Date();
      await this.treeShareRepo.save(saved);
      throw new ApiError(
        502,
        'Share invite email could not be sent. Please check Resend settings.',
      );
    }

    return this.mapShareToResponse(saved);
  }

  async getShares(treeId: string, userId: string) {
    await this.getOwnedTree(treeId, userId);

    const shares = await this.treeShareRepo.find({
      where: { treeId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return shares.map((s) => this.mapShareToResponse(s));
  }

  async updateShare(
    treeId: string,
    shareId: string,
    userId: string,
    dto: UpdateTreeShareDto,
  ) {
    await this.getOwnedTree(treeId, userId);

    const share = await this.treeShareRepo.findOne({
      where: { id: shareId, treeId, deletedAt: IsNull() },
    });

    if (!share) {
      throw new ApiError(404, 'Share not found');
    }

    share.permission = dto.permission;
    const saved = await this.treeShareRepo.save(share);
    return this.mapShareToResponse(saved);
  }

  async deleteShare(treeId: string, shareId: string, userId: string) {
    await this.getOwnedTree(treeId, userId);

    const share = await this.treeShareRepo.findOne({
      where: { id: shareId, treeId, deletedAt: IsNull() },
    });

    if (!share) {
      throw new ApiError(404, 'Share not found');
    }

    share.deletedAt = new Date();
    await this.treeShareRepo.save(share);
  }

  async acceptShare(token: string, userId: string, userEmail: string) {
    const share = await this.treeShareRepo.findOne({
      where: { token, status: TreeShareStatus.PENDING, deletedAt: IsNull() },
      relations: ['tree'],
    });

    if (!share) {
      throw new ApiError(404, 'Share invite not found or already accepted');
    }

    if (share.sharedWithEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ApiError(
        403,
        `This invite was sent to ${share.sharedWithEmail}. Please sign in with that email to accept it.`,
      );
    }

    share.status = TreeShareStatus.ACCEPTED;
    share.sharedWithUserId = userId;
    const saved = await this.treeShareRepo.save(share);

    return {
      id: saved.id,
      treeId: saved.treeId,
      treeName: share.tree.name,
      permission: saved.permission,
    };
  }

  private mapShareToResponse(share: TreeShare) {
    return {
      id: share.id,
      treeId: share.treeId,
      sharedWithEmail: share.sharedWithEmail,
      permission: share.permission,
      status: share.status,
      token: share.token,
      createdAt: share.createdAt.toISOString(),
    };
  }
}
