import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class dropColumnalbumId20210526101000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('albums', 'albumId');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('albums', new TableColumn({
      name: 'albumId',
      type: 'int',
      isNullable: true
    }))
  }
}