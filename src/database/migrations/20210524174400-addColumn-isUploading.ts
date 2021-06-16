import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addColumnisUploading20210524174400 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('previews', new TableColumn({
      name: 'isUploading',
      type: 'boolean',
      isNullable: true
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('previews', 'isUploading');
  }

}