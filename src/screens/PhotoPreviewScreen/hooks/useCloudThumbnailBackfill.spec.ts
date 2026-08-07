import { act, renderHook } from '@testing-library/react-native';
import { createElement, PropsWithChildren } from 'react';
import { PhotoThumbnailBackfillService } from 'src/services/photos/PhotoThumbnailBackfillService';
import { useAppDispatch } from 'src/store/hooks';
import { CloudPhotoItem, PhotoItem } from '../../PhotosScreen/types';
import { PreviewThumbnailBackfillContext } from '../context/PreviewThumbnailBackfillContext';
import { useCloudThumbnailBackfill } from './useCloudThumbnailBackfill';

jest.mock('src/services/photos/PhotoThumbnailBackfillService', () => ({
  PhotoThumbnailBackfillService: { backfillCloudThumbnail: jest.fn() },
}));

jest.mock('src/store/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

const incrementCloudFetchRevisionAction = { type: 'photos/incrementCloudFetchRevision' };

jest.mock('src/store/slices/photos', () => ({
  photosActions: { incrementCloudFetchRevision: jest.fn(() => incrementCloudFetchRevisionAction) },
}));

jest.mock('src/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockBackfillCloudThumbnail = PhotoThumbnailBackfillService.backfillCloudThumbnail as jest.Mock;
const mockDispatch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
});

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'cloud-1',
  type: 'cloud-only',
  mediaType: 'photo',
  fileName: 'photo.dng',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  folderDate: 0,
  uploadedAt: 0,
  isFavorite: false,
  ...overrides,
});

const backfilledRefs = {
  thumbnailBucketId: 'bucket-1',
  thumbnailBucketFile: 'file-1',
  thumbnailType: 'JPEG',
  thumbnailPath: '/local/thumb.jpg',
};

const makeWrapper =
  (onThumbnailBackfilled: jest.Mock = jest.fn()) =>
  ({ children }: PropsWithChildren): JSX.Element =>
    createElement(PreviewThumbnailBackfillContext.Provider, { value: { onThumbnailBackfilled } }, children);

describe('useCloudThumbnailBackfill', () => {
  test('when the backfill succeeds, then onBackfilled is called with the new refs and the cloud fetch revision is incremented', async () => {
    mockBackfillCloudThumbnail.mockResolvedValue(backfilledRefs);
    const onBackfilled = jest.fn();
    const item = makeCloudItem();

    renderHook(() => useCloudThumbnailBackfill(item, '/local/full.dng'), { wrapper: makeWrapper(onBackfilled) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onBackfilled).toHaveBeenCalledWith('cloud-1', backfilledRefs);
    expect(mockDispatch).toHaveBeenCalledWith(incrementCloudFetchRevisionAction);
  });

  test('when the backfill does not produce refs, then onBackfilled is not called and nothing is dispatched', async () => {
    mockBackfillCloudThumbnail.mockResolvedValue(null);
    const onBackfilled = jest.fn();
    const item = makeCloudItem();

    renderHook(() => useCloudThumbnailBackfill(item, '/local/full.dng'), { wrapper: makeWrapper(onBackfilled) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onBackfilled).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('when the item is local, then the backfill service is not called', async () => {
    const item: PhotoItem = {
      id: 'local-1',
      type: 'local',
      mediaType: 'photo',
      createdAt: 0,
      backupState: 'backed',
    };

    renderHook(() => useCloudThumbnailBackfill(item, '/local/full.jpg'), { wrapper: makeWrapper() });

    expect(mockBackfillCloudThumbnail).not.toHaveBeenCalled();
  });

  test('when the uri is not ready yet, then the backfill service is not called', async () => {
    const item = makeCloudItem();

    renderHook(() => useCloudThumbnailBackfill(item, null), { wrapper: makeWrapper() });

    expect(mockBackfillCloudThumbnail).not.toHaveBeenCalled();
  });

  test('when the item already has a thumbnail, then the backfill service is not called', async () => {
    const item = makeCloudItem({ thumbnailBucketFile: 'existing-file-id' });

    renderHook(() => useCloudThumbnailBackfill(item, '/local/full.dng'), { wrapper: makeWrapper() });

    expect(mockBackfillCloudThumbnail).not.toHaveBeenCalled();
  });

  test('when rerendered with the same item, then the backfill is only attempted once', async () => {
    mockBackfillCloudThumbnail.mockResolvedValue(backfilledRefs);
    const item = makeCloudItem();

    const { rerender } = renderHook(({ uri }) => useCloudThumbnailBackfill(item, uri), {
      initialProps: { uri: '/local/full.dng' },
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await Promise.resolve();
    });

    rerender({ uri: '/local/full.dng' });

    expect(mockBackfillCloudThumbnail).toHaveBeenCalledTimes(1);
  });
});
