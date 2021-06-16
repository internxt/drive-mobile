import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class addColumnHash20210531162000 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('photoAlbums', new TableColumn({
      name: 'hash',
      type: 'string'
    }))
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('photoAlbums', 'hash');
  }

}