import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createAlbumsTables20210513172200 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'albums',
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true
        },
        {
          name: 'name',
          type: 'string'
        },
        {
          name: 'userId',
          type: 'string',
          isNullable: false
        }
      ]
    }), true)

    await queryRunner.createTable(new Table({
      name: 'photoAlbums',
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true
        },
        {
          name: 'previewId',
          type: 'int'
        },
        {
          name: 'albumId',
          type: 'int'
        }
      ]
    }), true);

  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('albums');
    await queryRunner.dropTable('photoAlbums');
  }

}