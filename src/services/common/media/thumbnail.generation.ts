import * as RNFS from '@dr.pogodin/react-native-fs';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import {
  IMAGE_THUMBNAIL_EXTENSIONS,
  PDF_THUMBNAIL_QUALITY,
  THUMBNAIL_JPEG_COMPRESS,
  THUMBNAIL_MAX_WIDTH,
  VIDEO_THUMBNAIL_DIR_SIZE,
  VIDEO_THUMBNAIL_EXTENSIONS,
} from './thumbnail.constants';
import type { GeneratedThumbnail } from './thumbnail.types';

const toFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);

const statSize = async (path: string): Promise<number> => Number((await RNFS.stat(path)).size);

const generateImageThumbnailAndroid = async (sourcePath: string): Promise<GeneratedThumbnail> => {
  const imageManipulatorContext = ImageManipulator.manipulate(toFileUri(sourcePath));
  imageManipulatorContext.resize({ width: THUMBNAIL_MAX_WIDTH });
  const imageRef = await imageManipulatorContext.renderAsync();
  const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: THUMBNAIL_JPEG_COMPRESS });
  imageRef.release();
  imageManipulatorContext.release();
  const path = result.uri.replace('file://', '');
  return { path, width: result.width, height: result.height, size: await statSize(path), type: 'JPEG' };
};

const generateMediaThumbnail = async (sourcePath: string): Promise<GeneratedThumbnail> => {
  const result = await createThumbnail({
    url: toFileUri(sourcePath),
    dirSize: VIDEO_THUMBNAIL_DIR_SIZE,
    maxWidth: THUMBNAIL_MAX_WIDTH,
    maxHeight: THUMBNAIL_MAX_WIDTH,
  });
  const path = result.path.replace('file://', '');
  return { path, width: result.width, height: result.height, size: await statSize(path), type: 'JPEG' };
};

// iOS uses the patched react-native-create-thumbnail
// instead of expo-image-manipulator: subsampled decode avoids loading the full bitmap
// into memory, preventing jetsam kills in the share extension
export const generateImageThumbnail = async (sourcePath: string): Promise<GeneratedThumbnail> =>
  Platform.OS === 'android' ? generateImageThumbnailAndroid(sourcePath) : generateMediaThumbnail(sourcePath);

export const generateVideoThumbnail = (sourcePath: string): Promise<GeneratedThumbnail> =>
  generateMediaThumbnail(sourcePath);

export const generatePdfThumbnail = async (sourcePath: string): Promise<GeneratedThumbnail> => {
  const result = await PdfThumbnail.generate(toFileUri(sourcePath), 0, PDF_THUMBNAIL_QUALITY);
  const path = result.uri.replace('file://', '');
  return { path, width: result.width, height: result.height, size: await statSize(path), type: 'JPEG' };
};

export const generateThumbnail = async (sourcePath: string, extension: string): Promise<GeneratedThumbnail> => {
  const extensionLower = extension.toLowerCase();
  if (IMAGE_THUMBNAIL_EXTENSIONS.has(extensionLower)) return generateImageThumbnail(sourcePath);
  if (VIDEO_THUMBNAIL_EXTENSIONS.has(extensionLower)) return generateVideoThumbnail(sourcePath);
  return generatePdfThumbnail(sourcePath);
};
