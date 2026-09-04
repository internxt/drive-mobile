import * as RNFS from '@dr.pogodin/react-native-fs';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { createThumbnail } from 'react-native-create-thumbnail';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { logger } from '../logger';
import { stripFileUri, toFileUri } from '../uri/uriHelpers';
import {
  IMAGE_THUMBNAIL_EXTENSIONS,
  PDF_THUMBNAIL_QUALITY,
  RAW_IMAGE_THUMBNAIL_EXTENSIONS,
  THUMBNAIL_JPEG_COMPRESS,
  THUMBNAIL_MAX_WIDTH,
  VIDEO_THUMBNAIL_DIR_SIZE,
  VIDEO_THUMBNAIL_EXTENSIONS,
} from './thumbnail.constants';
import type { GeneratedThumbnail } from './thumbnail.types';

const statSize = async (path: string): Promise<number> => Number((await RNFS.stat(path)).size);

const generateImageThumbnailViaManipulator = async (sourcePath: string): Promise<GeneratedThumbnail> => {
  const imageManipulatorContext = ImageManipulator.manipulate(toFileUri(sourcePath));
  imageManipulatorContext.resize({ width: THUMBNAIL_MAX_WIDTH });
  const imageRef = await imageManipulatorContext.renderAsync();
  const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: THUMBNAIL_JPEG_COMPRESS });
  imageRef.release();
  imageManipulatorContext.release();
  const path = stripFileUri(result.uri);
  return { path, width: result.width, height: result.height, size: await statSize(path), type: 'JPEG' };
};

const generateMediaThumbnail = async (sourcePath: string): Promise<GeneratedThumbnail> => {
  const result = await createThumbnail({
    url: toFileUri(sourcePath),
    dirSize: VIDEO_THUMBNAIL_DIR_SIZE,
    maxWidth: THUMBNAIL_MAX_WIDTH,
    maxHeight: THUMBNAIL_MAX_WIDTH,
  });
  const path = stripFileUri(result.path);
  return { path, width: result.width, height: result.height, size: await statSize(path), type: 'JPEG' };
};

// iOS uses the patched react-native-create-thumbnail
// instead of expo-image-manipulator: subsampled decode avoids loading the full bitmap
// into memory, preventing jetsam kills in the share extension
export const generateImageThumbnail = async (sourcePath: string): Promise<GeneratedThumbnail> =>
  Platform.OS === 'android' ? generateImageThumbnailViaManipulator(sourcePath) : generateMediaThumbnail(sourcePath);

export const generateRawImageThumbnail = (sourcePath: string): Promise<GeneratedThumbnail> =>
  generateImageThumbnailViaManipulator(sourcePath);

export const generateVideoThumbnail = (sourcePath: string): Promise<GeneratedThumbnail> =>
  generateMediaThumbnail(sourcePath);

export const generatePdfThumbnail = async (sourcePath: string): Promise<GeneratedThumbnail> => {
  const result = await PdfThumbnail.generate(toFileUri(sourcePath), 0, PDF_THUMBNAIL_QUALITY);
  const path = stripFileUri(result.uri);
  return { path, width: result.width, height: result.height, size: await statSize(path), type: 'JPEG' };
};

export const generateThumbnail = async (sourcePath: string, extension: string): Promise<GeneratedThumbnail> => {
  const extensionLower = extension.toLowerCase();
  try {
    if (RAW_IMAGE_THUMBNAIL_EXTENSIONS.has(extensionLower)) {
      return await generateRawImageThumbnail(sourcePath);
    }
    if (IMAGE_THUMBNAIL_EXTENSIONS.has(extensionLower)) {
      return await generateImageThumbnail(sourcePath);
    }
    if (VIDEO_THUMBNAIL_EXTENSIONS.has(extensionLower)) {
      return await generateVideoThumbnail(sourcePath);
    }
    return await generatePdfThumbnail(sourcePath);
  } catch (error) {
    logger.error(`[thumbnail.generation] Failed to generate thumbnail for ${sourcePath}: ${error}`);
    throw error;
  }
};
