import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNameToUsers1780000000000 implements MigrationInterface {
  name = 'AddNameToUsers1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'last_name',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      UPDATE "users"
      SET
        "first_name" = COALESCE(NULLIF(split_part(split_part("email", '@', 1), '.', 1), ''), 'MyRoots'),
        "last_name" = COALESCE(NULLIF(split_part(split_part("email", '@', 1), '.', 2), ''), 'User')
      WHERE "first_name" IS NULL OR "last_name" IS NULL
    `);

    await queryRunner.changeColumn(
      'users',
      'first_name',
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        length: '100',
        isNullable: false,
      }),
    );
    await queryRunner.changeColumn(
      'users',
      'last_name',
      new TableColumn({
        name: 'last_name',
        type: 'varchar',
        length: '100',
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'last_name');
    await queryRunner.dropColumn('users', 'first_name');
  }
}
