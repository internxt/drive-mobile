import { renderHook, waitFor } from '@testing-library/react-native';
import { driveFileService } from '@internxt-mobile/services/drive/file';
import { logger } from '@internxt-mobile/services/common';
import { DownloadedThumbnail } from '@internxt-mobile/types/drive/file';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useAppSelector } from '../../store/hooks';
import { useDownloadedThumbnail } from './useDownloadedThumbnail';

jest.mock('@internxt-mobile/services/drive/file', () => ({
  driveFileService: {
    getThumbnail: jest.fn(),
  },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

const getThumbnailMock = driveFileService.getThumbnail as jest.Mock;
const useAppSelectorMock = useAppSelector as jest.Mock;

const authenticatedUser = { uuid: 'user-uuid' };
const thumbnailEntry = { bucketFile: 'bucket-file' };
const thumbnail: DownloadedThumbnail = { width: 100, height: 80, uri: 'file:///thumb.png' };

const arrange = (data: Partial<Pick<DriveItemData, 'isFolder' | 'thumbnails'>>, user: unknown = authenticatedUser) => {
  useAppSelectorMock.mockReturnValue(user);

  return {
    isFolder: false,
    thumbnails: [thumbnailEntry],
    ...data,
  } as Pick<DriveItemData, 'isFolder' | 'thumbnails'>;
};

describe('useDownloadedThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getThumbnailMock.mockResolvedValue(thumbnail);
  });

  test('when the item has thumbnails and there is a user, then it downloads and returns the thumbnail', async () => {
    const data = arrange({});

    const { result } = renderHook(() => useDownloadedThumbnail(data));

    await waitFor(() => expect(result.current).toEqual(thumbnail));
    expect(getThumbnailMock).toHaveBeenCalledTimes(1);
    expect(getThumbnailMock).toHaveBeenCalledWith(thumbnailEntry, authenticatedUser);
  });

  test('when the item has no thumbnails, then it does not download and returns null', async () => {
    const data = arrange({ thumbnails: [] });

    const { result } = renderHook(() => useDownloadedThumbnail(data));

    await waitFor(() => expect(getThumbnailMock).not.toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  test('when the item is a folder, then it does not download and returns null', async () => {
    const data = arrange({ isFolder: true });

    const { result } = renderHook(() => useDownloadedThumbnail(data));

    await waitFor(() => expect(getThumbnailMock).not.toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  test('when the thumbnail download fails, then it logs the error and returns null without throwing', async () => {
    const downloadError = new Error('download failed');
    getThumbnailMock.mockRejectedValue(downloadError);
    const data = arrange({});

    const { result } = renderHook(() => useDownloadedThumbnail(data));

    await waitFor(() => expect(logger.error).toHaveBeenCalledWith(downloadError));
    expect(result.current).toBeNull();
  });

  test('when there is no authenticated user, then it does not download and returns null', async () => {
    const data = arrange({}, null);

    const { result } = renderHook(() => useDownloadedThumbnail(data));

    await waitFor(() => expect(getThumbnailMock).not.toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
