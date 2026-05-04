import { PhotoDeduplicator } from './PhotoDeduplicator';
import { photosLocalDB } from './database/photosLocalDB';

jest.mock('./database/photosLocalDB', () => ({
  photosLocalDB: { getSyncedIds: jest.fn() },
}));

const mockDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeAssets = (ids: string[]) => ids.map((id) => ({ id })) as never;

describe('PhotoDeduplicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when DB is empty, then all assets are returned as pending', async () => {
    mockDB.getSyncedIds.mockResolvedValueOnce(new Set());

    const result = await PhotoDeduplicator.filter(makeAssets(['a', 'b', 'c']));

    expect(result.map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });

  test('when all assets are synced, then empty array is returned', async () => {
    mockDB.getSyncedIds.mockResolvedValueOnce(new Set(['a', 'b', 'c']));

    const result = await PhotoDeduplicator.filter(makeAssets(['a', 'b', 'c']));

    expect(result).toHaveLength(0);
  });

  test('when some assets are synced, then only pending ones are returned', async () => {
    mockDB.getSyncedIds.mockResolvedValueOnce(new Set(['b']));

    const result = await PhotoDeduplicator.filter(makeAssets(['a', 'b', 'c']));

    expect(result.map((a) => a.id)).toEqual(['a', 'c']);
  });

  test('when input is empty, then no DB call is made and empty array is returned', async () => {
    const result = await PhotoDeduplicator.filter([]);

    expect(mockDB.getSyncedIds).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
