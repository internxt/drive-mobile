import { DriveListItem } from '../../../types/drive/item';
import { SortDirection, SortType } from '../../../types/drive/ui';
import { driveFileService } from './driveFile.service';

const SAME_DATE = '2025-02-16T00:00:00.000Z';
const LATER_DATE = '2026-06-14T00:00:00.000Z';

const buildItem = (name: string, updatedAt: string) => ({ data: { name, updatedAt } }) as DriveListItem;

const getNames = (items: DriveListItem[]) => items.map((item) => item.data.name);

describe('Sorting a Drive list by date', () => {
  test('when two items have the same date, then they keep the order they arrived in', () => {
    const items = [buildItem('2006-09-12', SAME_DATE), buildItem('2006-10-02', SAME_DATE)];

    const newerFirst = [...items].sort(
      driveFileService.getSortFunction({ type: SortType.UpdatedAt, direction: SortDirection.Asc }),
    );
    const olderFirst = [...items].sort(
      driveFileService.getSortFunction({ type: SortType.UpdatedAt, direction: SortDirection.Desc }),
    );

    expect(getNames(newerFirst)).toStrictEqual(['2006-09-12', '2006-10-02']);
    expect(getNames(olderFirst)).toStrictEqual(['2006-09-12', '2006-10-02']);
  });

  test('when sorting newer first, then the latest change goes on top', () => {
    const items = [buildItem('2006-09-12', SAME_DATE), buildItem('20260530_Hochzeit', LATER_DATE)];

    const sortedItems = items.sort(
      driveFileService.getSortFunction({ type: SortType.UpdatedAt, direction: SortDirection.Asc }),
    );

    expect(getNames(sortedItems)).toStrictEqual(['20260530_Hochzeit', '2006-09-12']);
  });
});
