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
import { Person } from './Person';
import { Tree } from './Tree';

@Entity('person_spouses')
export class PersonSpouse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tree_id', type: 'uuid' })
  treeId!: string;

  @Column({ name: 'person_id', type: 'uuid' })
  personId!: string;

  @Column({ name: 'spouse_id', type: 'uuid' })
  spouseId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;

  @ManyToOne(() => Tree)
  @JoinColumn({ name: 'tree_id' })
  tree!: Tree;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'person_id' })
  person!: Person;

  @ManyToOne(() => Person)
  @JoinColumn({ name: 'spouse_id' })
  spouse!: Person;
}
