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

  test('when DB is empty, then all assets are returned as pending', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(new Map());

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(result.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  test('when all assets are synced with matching modificationTime, then empty array is returned', async () => {
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

  test('when some assets are synced, then only pending ones are returned', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['b', { modificationTime: 1000 }]]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b'), makeAsset('c')]);

    expect(result.map((a) => a.id)).toEqual(['a', 'c']);
  });

  test('when a synced asset has a newer modificationTime on device, then it is returned as pending', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 500 }]]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(result.map((asset) => asset.id)).toEqual(['a']);
  });

  test('when a synced asset has null modificationTime in DB, then it is not re-queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: null }]]),
    );

    const result = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(result).toHaveLength(0);
  });

  test('when input is empty, then no DB call is made and empty array is returned', async () => {
    const result = await PhotoDeduplicator.getAssetsToSync([]);

    expect(mockDB.getSyncedEntries).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
