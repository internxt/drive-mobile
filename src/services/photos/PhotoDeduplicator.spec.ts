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

  test('when no photos have been synced before, then all photos are queued for sync', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(new Map());

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(result.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  test('when all photos are already synced and unmodified, then nothing is queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([
        ['a', { modificationTime: 1000 }],
        ['b', { modificationTime: 1000 }],
        ['c', { modificationTime: 1000 }],
      ]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(result).toHaveLength(0);
  });

  test('when some photos are already synced, then only the unsynced ones are queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['b', { modificationTime: 1000 }]]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(result.map((a) => a.id)).toEqual(['a', 'c']);
  });

  test('when a previously synced photo has been edited on the device, then it is re-queued for sync', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 500 }]]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(result.map((asset) => asset.id)).toEqual(['a']);
  });

  test('when a synced photo has no recorded modification time, then it is not re-queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: null }]]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(result).toHaveLength(0);
  });

  test('when there are no photos to check, then no database query is made and nothing is queued', async () => {
    const result = await PhotoDeduplicator.getAssetsToSync([]);

    expect(mockDB.getSyncedEntries).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
