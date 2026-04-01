import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import * as RNFS from '@dr.pogodin/react-native-fs';
import fileSystemService, { fs } from '@internxt-mobile/services/FileSystemService';

import { isThumbnailSupported } from './thumbnail.constants';
import { generateThumbnail as generateThumbnailShared } from './thumbnail.generation';
export type { GeneratedThumbnail } from './thumbnail.types';

export const PROFILE_PICTURE_CACHE_KEY = 'PROFILE_PICTURE';
export type ThumbnailGenerateConfig = {
  outputPath: string;
  quality?: number;
  width?: number;
  height?: number;
};

class ImageService {
  public async resize({
    uri,
    width,
    height,
    quality,
    outputPath,
  }: {
    uri: string;
    width: number;
    height?: number;
    format: string;
    quality: number;
    rotation?: number;
    outputPath?: string;
  }) {
    const getRequiredUriFormat = () => {
      if (uri.startsWith('file:')) {
        return uri;
      } else {
        return `file://${uri.startsWith('/') ? uri : `/${uri}`}`;
      }
    };

    const imageManipulatorContext = ImageManipulator.manipulate(getRequiredUriFormat());
    imageManipulatorContext.resize({ width, height });
    const imageRef = await imageManipulatorContext.renderAsync();
    const result = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: quality / 100 });

    const stat = await fileSystemService.statRNFS(result.uri);
    if (outputPath && !(await fileSystemService.exists(outputPath))) {
      await fileSystemService.copyFile(result.uri, outputPath);
    }
    return {
      size: stat.size,
      width: result.width,
      height: result.height,
      path: outputPath || result.uri,
    };
  }

  /**
   * Cache an image from an URL and stores it using a cacheKey, can be
   * retrieved using getCachedImage() method
   *
   * @param imageUri
   * @param cacheKey Key to identify the cached image and retrieve it
   */
  public cacheImage = async (imageUri: string, cacheKey: string) => {
    const path = fs.getCacheDir() + `/cached_${cacheKey}`;
    await fs.unlinkIfExists(path);

    const download = RNFS.downloadFile({
      fromUrl: imageUri,
      toFile: path,
    });

    const result = await download.promise;

    return result.bytesWritten !== 0 ? true : false;
  };

  public deleteCachedImage = async (cacheKey: string) => {
    const path = fs.getCacheDir() + `/cached_${cacheKey}`;

    await fs.unlinkIfExists(path);
  };

  /**
   * Retrieves the path to a cached image by a key
   * @param cacheKey Cache key to retrieve the image from
   * @returns The path to the filesystem
   */
  public getCachedImage = async (cacheKey: string) => {
    const path = fs.getCacheDir() + `/cached_${cacheKey}`;

    const exists = await fs.exists(path);

    if (!exists) return null;

    const finalPath = fs.tmpFilePath();
    // Move to a TMP dir with a different name to trigger cache busting
    await fs.copyFile(path, finalPath);
    return fs.pathToUri(finalPath);
  };

  /**
   * Generates a thumbnail for a file, if the extension cannot be handled, returns null
   */
  public async generateThumbnail(
    filePath: string,
    config: { outputPath: string; quality?: number; extension: string; thumbnailFormat: SaveFormat },
  ) {
    if (!isThumbnailSupported(config.extension)) {
      // eslint-disable-next-line no-console
      console.error(`Cannot generate thumbnail for extension ${config.extension}`);
      return null;
    }
    return generateThumbnailShared(filePath, config.extension);
  }
}

export const imageService = new ImageService();
