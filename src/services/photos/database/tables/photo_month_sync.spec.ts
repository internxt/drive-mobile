import photoMonthSyncTable from './photo_month_sync';

const nullableColumnsOf = (createTable: string): string[] =>
  createTable
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[a-z_]+\s+(INTEGER|TEXT|REAL|BLOB)\s*,?$/.test(line))
    .map((line) => line.split(/\s+/)[0]);

describe('photo_month_sync schema', () => {
  test('when a nullable column exists, then it can also reach installs that predate it', () => {
    const declared = nullableColumnsOf(photoMonthSyncTable.statements.createTable);
    const migrated = photoMonthSyncTable.migrateAddColumns.map(
      (statement) => /ADD COLUMN (\w+)/.exec(statement)?.[1] ?? '',
    );

    expect(declared.length).toBeGreaterThan(0);
    expect(migrated.sort()).toEqual(declared.sort());
  });
});
