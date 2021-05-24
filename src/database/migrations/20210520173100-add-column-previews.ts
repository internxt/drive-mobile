import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addColumnPreviews20210520173100 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('previews', new TableColumn({
      name: 'isDownloading',
      type: 'boolean'
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('previews', 'isDownloading');
  }

}