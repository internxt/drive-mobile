import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class addLocalPhotos20210427115600 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'localPhotos',
      columns: [
        {
          name: 'id',
          type: 'int',
          isPrimary: true,
          isGenerated: true
        },
        {
          name: 'hash',
          type: 'string',
          isNullable: false
        }
      ]
    }), true)

  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('localPhotos');
  }

}