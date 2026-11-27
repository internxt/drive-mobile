jest.mock('@internxt-mobile/services/drive/file', () => ({
  driveFileService: {
    regenerateThumbnail: jest.fn(),
  },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  reportError: jest.fn(),
}));

import { driveFileService } from '@internxt-mobile/services/drive/file';
import { renderHook, waitFor } from '@testing-library/react-native';
import { canGenerateThumbnail, shouldRegenerateThumbnail, useThumbnailRegeneration } from './useThumbnailRegeneration';

describe('useThumbnailRegeneration', () => {
  describe('canGenerateThumbnail', () => {
    it('should return true for image types', () => {
      expect(canGenerateThumbnail('png')).toBe(true);
      expect(canGenerateThumbnail('PNG')).toBe(true);
      expect(canGenerateThumbnail('jpg')).toBe(true);
      expect(canGenerateThumbnail('jpeg')).toBe(true);
      expect(canGenerateThumbnail('HEIC')).toBe(true);
    });

    it('should return true for video types', () => {
      expect(canGenerateThumbnail('mp4')).toBe(true);
      expect(canGenerateThumbnail('MP4')).toBe(true);
      expect(canGenerateThumbnail('mov')).toBe(true);
      expect(canGenerateThumbnail('avi')).toBe(true);
    });

    it('should return true for PDF', () => {
      expect(canGenerateThumbnail('pdf')).toBe(true);
      expect(canGenerateThumbnail('PDF')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(canGenerateThumbnail('txt')).toBe(false);
      expect(canGenerateThumbnail('docx')).toBe(false);
      expect(canGenerateThumbnail('zip')).toBe(false);
    });
  });

  describe('shouldRegenerateThumbnail', () => {
    it('should return true when file is downloaded, has no thumbnails, and is supported type', () => {
      const result = shouldRegenerateThumbnail({
        downloadedFilePath: '/path/to/file.jpg',
        fileExtension: 'jpg',
        fileUuid: 'uuid-123',
        hasThumbnails: false,
      });
      expect(result).toBe(true);
    });

    it('should return false when file already has thumbnails', () => {
      const result = shouldRegenerateThumbnail({
        downloadedFilePath: '/path/to/file.jpg',
        fileExtension: 'jpg',
        fileUuid: 'uuid-123',
        hasThumbnails: true,
      });
      expect(result).toBe(false);
    });

    it('should return false when file is not downloaded', () => {
      const result = shouldRegenerateThumbnail({
        downloadedFilePath: undefined,
        fileExtension: 'jpg',
        fileUuid: 'uuid-123',
        hasThumbnails: false,
      });
      expect(result).toBe(false);
    });

    it('should return false when file type is unsupported', () => {
      const result = shouldRegenerateThumbnail({
        downloadedFilePath: '/path/to/file.txt',
        fileExtension: 'txt',
        fileUuid: 'uuid-123',
        hasThumbnails: false,
      });
      expect(result).toBe(false);
    });

    it('should return false when file extension is missing', () => {
      const result = shouldRegenerateThumbnail({
        downloadedFilePath: '/path/to/file',
        fileExtension: undefined,
        fileUuid: 'uuid-123',
        hasThumbnails: false,
      });
      expect(result).toBe(false);
    });
  });

  describe('regenerating while swiping between files', () => {
    const regenerateThumbnailMock = driveFileService.regenerateThumbnail as jest.Mock;
    const regeneratedThumbnail = { id: 1 };
    const firstFile = {
      downloadedFilePath: '/cache/first.png',
      fileExtension: 'png',
      fileUuid: 'first-file',
      hasThumbnails: false,
    };
    const secondFile = {
      downloadedFilePath: '/cache/second.jpg',
      fileExtension: 'jpg',
      fileUuid: 'second-file',
      hasThumbnails: false,
    };

    beforeEach(() => {
      regenerateThumbnailMock.mockReset();
      regenerateThumbnailMock.mockResolvedValue(regeneratedThumbnail);
    });

    test('when the user swipes to another file without a thumbnail, then that file gets its own thumbnail too', async () => {
      const onSuccess = jest.fn();
      const { rerender } = renderHook(({ fileParams }) => useThumbnailRegeneration(fileParams, { onSuccess }), {
        initialProps: { fileParams: firstFile },
      });
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(regeneratedThumbnail, 'first-file'));

      rerender({ fileParams: secondFile });

      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(regeneratedThumbnail, 'second-file'));
      expect(regenerateThumbnailMock).toHaveBeenCalledWith('second-file', '/cache/second.jpg', 'jpg');
    });

    test('when the user swipes back to a file already tried, then its thumbnail is not generated again', async () => {
      const onSuccess = jest.fn();
      const { rerender } = renderHook(({ fileParams }) => useThumbnailRegeneration(fileParams, { onSuccess }), {
        initialProps: { fileParams: firstFile },
      });
      rerender({ fileParams: secondFile });
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));

      rerender({ fileParams: firstFile });

      expect(regenerateThumbnailMock).toHaveBeenCalledTimes(2);
    });
  });
});
