import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createInitTables20210422091200 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'photos',
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true
        },
        {
          name: 'fileId',
          type: 'string'
        },
        {
          name: 'name',
          type: 'string'
        },
        {
          name: 'type',
          type: 'string'
        },
        {
          name: 'hash',
          type: 'string'
        },
        {
          name: 'photoId',
          type: 'int',
          isNullable: false
        },
        {
          name: 'userId',
          type: 'string',
          isNullable: false
        }
      ]
    }), true)

    await queryRunner.createTable(new Table({
      name: 'previews',
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true
        },
        {
          name: 'fileId',
          type: 'string'
        },
        {
          name: 'type',
          type: 'string'
        },
        {
          name: 'hash',
          type: 'string',
          isNullable: true
        },
        {
          name:'photoId',
          type: 'int',
          isNullable: false
        },
        {
          name:'uri',
          type: 'string',
          isNullable: false
        },
        {
          name: 'userId',
          type: 'string',
          isNullable: false
        }
      ]
    }), true);

  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('photos');
    await queryRunner.dropTable('preview');
  }

}