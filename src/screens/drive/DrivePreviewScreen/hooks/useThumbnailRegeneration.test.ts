import { canGenerateThumbnail, shouldRegenerateThumbnail } from './useThumbnailRegeneration';

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
});
