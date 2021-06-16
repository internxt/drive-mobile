import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addColumnisUploading20210524174400 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('albums', new TableColumn({
      name: 'albumId',
      type: 'int',
      isNullable: true
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('albums', 'albumId');
  }

}