import { PhotoDeduplicator } from './PhotoDeduplicator';
import { photosLocalDB } from './database/photosLocalDB';

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: { getSyncedEntries: jest.fn() },
}));

const mockDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeAsset = (id: string, modificationTime = 1000) =>
  ({ id, modificationTime }) as never;

describe('PhotoDeduplicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when no photos have been synced before, then all photos are queued as new', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(new Map());

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(newAssets.map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(editedAssets).toHaveLength(0);
  });

  test('when all photos are already synced and unmodified, then nothing is queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([
        ['a', { modificationTime: 1000 }],
        ['b', { modificationTime: 1000 }],
        ['c', { modificationTime: 1000 }],
      ]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });

  test('when some photos are already synced, then only the unsynced ones are queued as new', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['b', { modificationTime: 1000 }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(newAssets.map((a) => a.id)).toEqual(['a', 'c']);
    expect(editedAssets).toHaveLength(0);
  });

  test('when a previously synced photo has been edited on the device, then it is queued as an edit', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 500 }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets.map((a) => a.id)).toEqual(['a']);
  });

  test('when a synced photo has no recorded modification time, then it is not re-queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: null }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });

  test('when there are no photos to check, then no database query is made and nothing is queued', async () => {
    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([]);

    expect(mockDB.getSyncedEntries).not.toHaveBeenCalled();
    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });
});
