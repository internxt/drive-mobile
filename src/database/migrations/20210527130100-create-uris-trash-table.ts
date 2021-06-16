import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class createUrisTrash20210527130100 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'urisTrash',
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
          name: 'uri',
          type: 'string'
        },
        {
          name: 'userId',
          type: 'string',
          isNullable: false
        }
      ]
    }), true)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('urisTrash');
  }

}