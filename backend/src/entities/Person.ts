import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Gender } from '../types/common.types';
import { Tree } from './Tree';

@Entity('persons')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tree_id', type: 'uuid' })
  treeId!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'enum', enum: Gender })
  gender!: Gender;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: string | null;

  @Column({ name: 'death_date', type: 'date', nullable: true })
  deathDate!: string | null;

  @Column({ name: 'birth_place', type: 'varchar', length: 255, nullable: true })
  birthPlace!: string | null;

  @Column({ name: 'current_place', type: 'varchar', length: 255, nullable: true })
  currentPlace!: string | null;

  @Column({ name: 'health_note', type: 'text', nullable: true })
  healthNote!: string | null;

  @Column({ name: 'profile_image_path', type: 'varchar', length: 512, nullable: true })
  profileImagePath!: string | null;

  @Column({ name: 'is_root', type: 'boolean', default: false })
  isRoot!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Tree)
  @JoinColumn({ name: 'tree_id' })
  tree!: Tree;

  @ManyToOne(() => Person, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent!: Person | null;

  @OneToMany(() => Person, (person) => person.parent)
  children!: Person[];
}
