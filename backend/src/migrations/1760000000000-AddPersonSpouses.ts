import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonSpouses1760000000000 implements MigrationInterface {
  name = 'AddPersonSpouses1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "person_spouses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tree_id" uuid NOT NULL,
        "person_id" uuid NOT NULL,
        "spouse_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_person_spouses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_person_spouses_tree" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_person_spouses_person" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_person_spouses_spouse" FOREIGN KEY ("spouse_id") REFERENCES "persons"("id") ON DELETE CASCADE,
        CONSTRAINT "CK_person_spouses_no_self" CHECK ("person_id" <> "spouse_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_person_spouses_tree_id" ON "person_spouses" ("tree_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_person_spouses_person_id" ON "person_spouses" ("person_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_person_spouses_spouse_id" ON "person_spouses" ("spouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_person_spouses_deleted_at" ON "person_spouses" ("deleted_at")
    `);

    // Prevent duplicate couple rows via canonical (lower, higher) ordering.
    // A row (A, B) and a row (B, A) cannot both exist; only one direction.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_person_spouses_unique_pair"
        ON "person_spouses" ("tree_id", LEAST("person_id", "spouse_id"), GREATEST("person_id", "spouse_id"))
        WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_person_spouses_unique_pair"`);
    await queryRunner.query(`DROP INDEX "IDX_person_spouses_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_person_spouses_spouse_id"`);
    await queryRunner.query(`DROP INDEX "IDX_person_spouses_person_id"`);
    await queryRunner.query(`DROP INDEX "IDX_person_spouses_tree_id"`);
    await queryRunner.query(`DROP TABLE "person_spouses"`);
  }
}
