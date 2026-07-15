import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_email" ON "users" ("email")
    `);

    await queryRunner.query(`
      CREATE TABLE "trees" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_trees" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trees_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trees_user_id" ON "trees" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trees_deleted_at" ON "trees" ("deleted_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "persons" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tree_id" uuid NOT NULL,
        "parent_id" uuid,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "gender" "gender_enum" NOT NULL,
        "birth_date" date,
        "death_date" date,
        "birth_place" character varying(255),
        "current_place" character varying(255),
        "profile_image_path" character varying(512),
        "is_root" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_persons" PRIMARY KEY ("id"),
        CONSTRAINT "FK_persons_tree" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_persons_parent" FOREIGN KEY ("parent_id") REFERENCES "persons"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_persons_tree_id" ON "persons" ("tree_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_persons_parent_id" ON "persons" ("parent_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_persons_deleted_at" ON "persons" ("deleted_at")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_persons_one_root_per_tree"
      ON "persons" ("tree_id")
      WHERE "is_root" = true AND "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_persons_one_root_per_tree"`);
    await queryRunner.query(`DROP INDEX "IDX_persons_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_persons_parent_id"`);
    await queryRunner.query(`DROP INDEX "IDX_persons_tree_id"`);
    await queryRunner.query(`DROP TABLE "persons"`);
    await queryRunner.query(`DROP INDEX "IDX_trees_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_trees_user_id"`);
    await queryRunner.query(`DROP TABLE "trees"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "gender_enum"`);
  }
}
