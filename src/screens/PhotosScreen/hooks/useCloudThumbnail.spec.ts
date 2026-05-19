import { driveFileService } from '@internxt-mobile/services/drive/file';
import { act, renderHook } from '@testing-library/react-native';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { CloudPhotoItem } from '../types';
import { useCloudThumbnail } from './useCloudThumbnail';

jest.mock('@internxt-mobile/services/drive/file', () => ({
  driveFileService: {
    getThumbnail: jest.fn(),
  },
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    setCloudThumbnailPath: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn().mockReturnValue({ id: 'user-1', email: 'test@example.com' }),
}));

const mockDriveFileService = driveFileService as jest.Mocked<typeof driveFileService>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'remote-1',
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: null,
  thumbnailBucketId: 'bucket-1',
  thumbnailBucketFile: 'file-1',
  thumbnailType: 'jpg',
  deviceId: 'device-1',
  createdAt: 1718000000000,
  fileName: 'photo.jpg',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPhotosLocalDB.setCloudThumbnailPath.mockResolvedValue(undefined);
});

describe('useCloudThumbnail', () => {
  test('when the item already has a local thumbnail path, then the drive API is not called', async () => {
    const item = makeCloudItem({ thumbnailPath: '/local/thumb.jpg' });

    const { result } = renderHook(() => useCloudThumbnail(item));

    expect(result.current.uri).toBe('/local/thumb.jpg');
    expect(mockDriveFileService.getThumbnail).not.toHaveBeenCalled();
  });

  test('when the item has no local path and no bucket info, then the drive API is not called', async () => {
    const item = makeCloudItem({ thumbnailPath: null, thumbnailBucketId: null, thumbnailBucketFile: null });

    renderHook(() => useCloudThumbnail(item));

    expect(mockDriveFileService.getThumbnail).not.toHaveBeenCalled();
  });

  test('when the item has no local path but has bucket info, then the thumbnail is downloaded and returned', async () => {
    mockDriveFileService.getThumbnail.mockResolvedValueOnce({ uri: '/downloaded/thumb.jpg' } as never);

    const item = makeCloudItem({ thumbnailPath: null });

    const { result } = renderHook(() => useCloudThumbnail(item));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.uri).toBe('/downloaded/thumb.jpg');
    expect(mockDriveFileService.getThumbnail).toHaveBeenCalledTimes(1);
  });

  test('when the thumbnail is successfully downloaded, then the path is persisted to the local database', async () => {
    mockDriveFileService.getThumbnail.mockResolvedValueOnce({ uri: '/downloaded/thumb.jpg' } as never);

    const item = makeCloudItem({ thumbnailPath: null });

    renderHook(() => useCloudThumbnail(item));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockPhotosLocalDB.setCloudThumbnailPath).toHaveBeenCalledWith('remote-1', '/downloaded/thumb.jpg');
  });

  test('when the thumbnail download fails, then null is returned and no error is thrown', async () => {
    mockDriveFileService.getThumbnail.mockRejectedValueOnce(new Error('network error'));

    const item = makeCloudItem({ thumbnailPath: null });

    const { result } = renderHook(() => useCloudThumbnail(item));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.uri).toBeNull();
    expect(mockPhotosLocalDB.setCloudThumbnailPath).not.toHaveBeenCalled();
  });

  test('when the list recycles the cell and the new item has a different persisted path, then the correct path is shown', async () => {
    const itemA = makeCloudItem({ id: 'remote-1', thumbnailPath: '/thumb-a.jpg' });
    const itemB = makeCloudItem({ id: 'remote-2', thumbnailPath: '/thumb-b.jpg' });

    const { result, rerender } = renderHook(({ item }) => useCloudThumbnail(item), {
      initialProps: { item: itemA },
    });

    expect(result.current.uri).toBe('/thumb-a.jpg');

    await act(async () => {
      rerender({ item: itemB });
    });

    expect(result.current.uri).toBe('/thumb-b.jpg');
    expect(mockDriveFileService.getThumbnail).not.toHaveBeenCalled();
  });

  test('when the list recycles the cell and the new item has no path, then a new download is triggered', async () => {
    const itemA = makeCloudItem({ id: 'remote-1', thumbnailPath: '/thumb-a.jpg' });
    const itemB = makeCloudItem({ id: 'remote-2', thumbnailPath: null });
    mockDriveFileService.getThumbnail.mockResolvedValueOnce({ uri: '/downloaded/thumb-b.jpg' } as never);

    const { result, rerender } = renderHook(({ item }) => useCloudThumbnail(item), {
      initialProps: { item: itemA },
    });

    expect(result.current.uri).toBe('/thumb-a.jpg');

    await act(async () => {
      rerender({ item: itemB });
    });

    expect(result.current.uri).toBe('/downloaded/thumb-b.jpg');
    expect(mockDriveFileService.getThumbnail).toHaveBeenCalledTimes(1);
  });

  test('when the component unmounts before the download finishes, then the state is not updated', async () => {
    let resolveThumbnail!: (value: { uri: string }) => void;
    mockDriveFileService.getThumbnail.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveThumbnail = resolve;
      }) as never,
    );

    const item = makeCloudItem({ thumbnailPath: null });

    const { result, unmount } = renderHook(() => useCloudThumbnail(item));

    unmount();

    await act(async () => {
      resolveThumbnail({ uri: '/downloaded/thumb.jpg' });
    });

    expect(result.current.uri).toBeNull();
    expect(mockPhotosLocalDB.setCloudThumbnailPath).not.toHaveBeenCalled();
  });

  test('when the image fails to load, then the stale path is cleared from the database and uri becomes null', async () => {
    const item = makeCloudItem({ thumbnailPath: '/stale/thumb.jpg', thumbnailBucketId: 'bucket-1', thumbnailBucketFile: 'file-1' });

    const { result } = renderHook(() => useCloudThumbnail(item));

    expect(result.current.uri).toBe('/stale/thumb.jpg');

    await act(async () => {
      result.current.onImageError();
    });

    expect(result.current.uri).toBeNull();
    expect(mockPhotosLocalDB.setCloudThumbnailPath).toHaveBeenCalledWith('remote-1', null);
  });
});
