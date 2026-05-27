import { PhotoDeduplicator } from './PhotoDeduplicator';
import { photosLocalDB } from './database/photosLocalDB';

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: { getSyncedEntries: jest.fn(), getDeletedAssetIds: jest.fn() },
}));

const mockDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeAsset = (id: string, modificationTime = 1000) => ({ id, modificationTime }) as never;

describe('PhotoDeduplicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDB.getDeletedAssetIds.mockResolvedValue(new Set());
  });

  test('when no photos have been synced before, then all photos are queued as new', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(new Map());

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([
      makeAsset('a'),
      makeAsset('b'),
      makeAsset('c'),
    ]);

    expect(newAssets.map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(editedAssets).toHaveLength(0);
  });

  test('when all photos are already synced and unmodified, then nothing is queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([
        ['a', { modificationTime: 1000, status: 'synced' as const }],
        ['b', { modificationTime: 1000, status: 'synced' as const }],
        ['c', { modificationTime: 1000, status: 'synced' as const }],
      ]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([
      makeAsset('a'),
      makeAsset('b'),
      makeAsset('c'),
    ]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });

  test('when some photos are already synced, then only the unsynced ones are queued as new', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['b', { modificationTime: 1000, status: 'synced' as const }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([
      makeAsset('a'),
      makeAsset('b'),
      makeAsset('c'),
    ]);

    expect(newAssets.map((a) => a.id)).toEqual(['a', 'c']);
    expect(editedAssets).toHaveLength(0);
  });

  test('when a previously synced photo has been edited on the device, then it is queued as an edit', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 500, status: 'synced' as const }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets.map((a) => a.id)).toEqual(['a']);
  });

  test('when a synced photo has no recorded modification time, then it is not re-queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: null, status: 'synced' as const }]]),
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

  test('when a photo was explicitly deleted from cloud, then it is excluded from new assets', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(new Map());
    mockDB.getDeletedAssetIds.mockResolvedValueOnce(new Set(['a']));

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a'), makeAsset('b')]);

    expect(newAssets.map((asset) => asset.id)).toEqual(['b']);
    expect(editedAssets).toHaveLength(0);
  });

  test('when a previously synced photo was explicitly deleted from cloud, then it is excluded from edited assets', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 500, status: 'synced' as const }]]),
    );
    mockDB.getDeletedAssetIds.mockResolvedValueOnce(new Set(['a']));

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });

  test('when a photo is marked cloud_deleted and not edited on device, then it is not re-queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 1000, status: 'cloud_deleted' as const }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });

  test('when a photo is marked cloud_deleted and was later edited on device, then it is treated as a new upload', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: 500, status: 'cloud_deleted' as const }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets.map((asset) => asset.id)).toEqual(['a']);
    expect(editedAssets).toHaveLength(0);
  });

  test('when a photo is marked cloud_deleted with no modification time and was edited, then it is not re-queued', async () => {
    mockDB.getSyncedEntries.mockResolvedValueOnce(
      new Map([['a', { modificationTime: null, status: 'cloud_deleted' as const }]]),
    );

    const { newAssets, editedAssets } = await PhotoDeduplicator.getAssetsToSync([makeAsset('a', 1000)]);

    expect(newAssets).toHaveLength(0);
    expect(editedAssets).toHaveLength(0);
  });
});
