import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tree } from './Tree';
import { User } from './User';

export enum TreeSharePermission {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
}

export enum TreeShareStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}

@Entity('tree_shares')
export class TreeShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tree_id', type: 'uuid' })
  treeId!: string;

  @Column({ name: 'shared_by_user_id', type: 'uuid' })
  sharedByUserId!: string;

  @Column({ name: 'shared_with_email', type: 'varchar', length: 255 })
  sharedWithEmail!: string;

  @Column({ name: 'shared_with_user_id', type: 'uuid', nullable: true })
  sharedWithUserId!: string | null;

  @Column({
    type: 'enum',
    enum: TreeSharePermission,
    default: TreeSharePermission.VIEW,
  })
  permission!: TreeSharePermission;

  @Column({
    type: 'enum',
    enum: TreeShareStatus,
    default: TreeShareStatus.PENDING,
  })
  status!: TreeShareStatus;

  @Column({ type: 'uuid', unique: true })
  token!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Tree)
  @JoinColumn({ name: 'tree_id' })
  tree!: Tree;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'shared_by_user_id' })
  sharedByUser!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'shared_with_user_id' })
  sharedWithUser!: User | null;
}
