import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddHealthNoteToPersons1770000000000 implements MigrationInterface {
  name = 'AddHealthNoteToPersons1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'persons',
      new TableColumn({
        name: 'health_note',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('persons', 'health_note');
  }
}
