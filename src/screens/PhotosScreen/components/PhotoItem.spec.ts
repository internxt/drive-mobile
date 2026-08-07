import { PhotoItem as PhotoItemType } from '../types';
import { localPhotoCellAreEqual } from './PhotoItem';

const makeItem = (overrides: Partial<PhotoItemType> = {}): PhotoItemType => ({
  id: 'asset-1',
  type: 'local',
  uri: 'ph://asset-1',
  createdAt: 0,
  modificationTime: 1000,
  backupState: 'backed',
  mediaType: 'photo',
  ...overrides,
});

const makeProps = (item: PhotoItemType) => ({ item, isSelectMode: false, isSelected: false });

describe('local photo cell memo comparator', () => {
  test('when nothing changes, then the cell is not re-rendered', () => {
    const prev = makeProps(makeItem());
    const next = makeProps(makeItem());

    expect(localPhotoCellAreEqual(prev, next)).toBe(true);
  });

  test('when only the modification time of a local photo changes, then the cell is re-rendered', () => {
    const prev = makeProps(makeItem({ modificationTime: 1000 }));
    const next = makeProps(makeItem({ modificationTime: 2000 }));

    expect(localPhotoCellAreEqual(prev, next)).toBe(false);
  });
});
