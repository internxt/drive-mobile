import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addColumnPreviews20210602172600 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('previews', new TableColumn({
      name: 'isSelected',
      type: 'boolean',
      isNullable: true
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('previews', 'isSelected');
  }

}