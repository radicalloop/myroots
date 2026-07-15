import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTreeShares1750000000000 implements MigrationInterface {
  name = 'AddTreeShares1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tree_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tree_id" uuid NOT NULL,
        "shared_by_user_id" uuid NOT NULL,
        "shared_with_email" character varying(255) NOT NULL,
        "shared_with_user_id" uuid,
        "permission" character varying NOT NULL DEFAULT 'VIEW',
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "token" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_tree_shares_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tree_shares_token" UNIQUE ("token"),
        CONSTRAINT "FK_tree_shares_tree_id" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tree_shares_shared_by_user_id" FOREIGN KEY ("shared_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tree_shares_shared_with_user_id" FOREIGN KEY ("shared_with_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      );

      CREATE INDEX "IDX_tree_shares_tree_id" ON "tree_shares" ("tree_id");
      CREATE INDEX "IDX_tree_shares_token" ON "tree_shares" ("token");
      CREATE INDEX "IDX_tree_shares_shared_with_user_id" ON "tree_shares" ("shared_with_user_id");
      CREATE INDEX "IDX_tree_shares_status" ON "tree_shares" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tree_shares"`);
  }
}
