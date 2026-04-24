import { FileExtension } from '@internxt-mobile/types/drive/file';

export const THUMBNAIL_MAX_WIDTH = 512;
export const THUMBNAIL_JPEG_COMPRESS = 0.8;
export const VIDEO_THUMBNAIL_DIR_SIZE = 100;
export const PDF_THUMBNAIL_QUALITY = 80;

export const IMAGE_THUMBNAIL_EXTENSIONS = new Set<string>([
  FileExtension.JPG,
  FileExtension.JPEG,
  FileExtension.PNG,
  FileExtension.HEIC,
]);
export const VIDEO_THUMBNAIL_EXTENSIONS = new Set<string>([FileExtension.MP4, FileExtension.MOV, FileExtension.AVI]);
export const PDF_THUMBNAIL_EXTENSIONS = new Set<string>([FileExtension.PDF]);

export const isThumbnailSupported = (extension: string): boolean => {
  const extensionLower = extension.toLowerCase();
  return (
    IMAGE_THUMBNAIL_EXTENSIONS.has(extensionLower) ||
    VIDEO_THUMBNAIL_EXTENSIONS.has(extensionLower) ||
    PDF_THUMBNAIL_EXTENSIONS.has(extensionLower)
  );
};
