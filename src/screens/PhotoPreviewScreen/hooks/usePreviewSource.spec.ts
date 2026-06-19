import { renderHook, waitFor } from '@testing-library/react-native';
import { PhotoAssetFetchService } from '../../../services/photos/PhotoAssetFetchService';
import { CloudPhotoItem, PhotoItem } from '../../PhotosScreen/types';
import { usePreviewSource } from './usePreviewSource';

jest.mock('../../../services/photos/PhotoAssetFetchService', () => ({
  PhotoAssetFetchService: { fetchPlaybackUri: jest.fn() },
}));

jest.mock('src/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockFetchPlaybackUri = PhotoAssetFetchService.fetchPlaybackUri as jest.Mock;

const makeLocalItem = (overrides: Partial<PhotoItem> = {}): PhotoItem => ({
  id: 'ABCD-1234/L0/001',
  type: 'local',
  uri: 'ph://ABCD-1234/L0/001',
  mediaType: 'photo',
  createdAt: Date.now(),
  backupState: 'backed',
  ...overrides,
});

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'cloud-uuid-1',
  type: 'cloud-only',
  mediaType: 'photo',
  fileName: 'photo.jpg',
  thumbnailPath: '/cache/thumb.jpg',
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  createdAt: Date.now(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchPlaybackUri.mockResolvedValue('file:///dcim/photo.jpg');
});

describe('usePreviewSource — uri resolution', () => {
  test('when the hook renders for an item, then fetchPlaybackUri is called and its result is returned', async () => {
    mockFetchPlaybackUri.mockResolvedValue('ph://ABCD-1234/L0/001');
    const item = makeLocalItem({ mediaType: 'video' });

    const { result } = renderHook(() => usePreviewSource(item, false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.uri).toBe('ph://ABCD-1234/L0/001');
    expect(mockFetchPlaybackUri).toHaveBeenCalledTimes(1);
  });

  test('when fetchPlaybackUri returns null, then uri is null', async () => {
    mockFetchPlaybackUri.mockResolvedValue(null);
    const item = makeLocalItem();

    const { result } = renderHook(() => usePreviewSource(item, false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.uri).toBeNull();
  });

  test('when a cloud item is previewed, then fetchPlaybackUri is called and its result is returned', async () => {
    mockFetchPlaybackUri.mockResolvedValue('file:///cache/photo_preview/cloud-uuid-1.jpg');
    const item = makeCloudItem();

    const { result } = renderHook(() => usePreviewSource(item, false));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.uri).toBe('file:///cache/photo_preview/cloud-uuid-1.jpg');
    expect(mockFetchPlaybackUri).toHaveBeenCalledTimes(1);
  });

  test('when scrubbing is active, then fetchPlaybackUri is not called', () => {
    const item = makeCloudItem();

    renderHook(() => usePreviewSource(item, true));

    expect(mockFetchPlaybackUri).not.toHaveBeenCalled();
  });
});

describe('usePreviewSource — thumbnailUri', () => {
  test('when item is local, then thumbnailUri is the item ph:// uri', () => {
    const item = makeLocalItem({ uri: 'ph://ABCD-1234/L0/001' });

    const { result } = renderHook(() => usePreviewSource(item, false));

    expect(result.current.thumbnailUri).toBe('ph://ABCD-1234/L0/001');
  });

  test('when item is cloud-only, then thumbnailUri is the cached thumbnail path', () => {
    const item = makeCloudItem({ thumbnailPath: '/cache/thumb.jpg' });

    const { result } = renderHook(() => usePreviewSource(item, false));

    expect(result.current.thumbnailUri).toBe('/cache/thumb.jpg');
  });
});
