import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { PhotoFileSystemRef, PhotoSizeType } from '@internxt-mobile/types/photos';
import { items } from '@internxt/lib';
import { createHash } from '@internxt/rn-crypto';
import { HMAC } from '@internxt/rn-crypto/src/types/crypto';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as crypto from 'react-native-crypto';
import { PHOTOS_FULL_SIZE_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY } from '../constants';
export class PhotosUtils {
  /**
   * Gets the type of the photo
   *
   * @param filename Filename usually provided by expo-media-library
   * @returns The photo type, like jpg, png, heic
   */
  public getPhotoType(filename: string) {
    const parts = filename.split('.');
    const extension = parts[parts.length - 1];

    return extension.toLowerCase();
  }

  /**
   * Gets the photo name
   *
   * @param filename  Filename usually provided by expo-media-library
   * @returns The photo name
   */
  public getPhotoName(filename: string) {
    const nameWithExtension = filename;
    const nameWithoutExtension = nameWithExtension.substring(0, nameWithExtension.lastIndexOf('.'));

    return nameWithoutExtension;
  }

  /**
   * Gets the real uri pointing to the photo file
   *
   * @param data name and type of the photo
   * @param uri camera roll provided uri, usually something like asset://... or ph://...
   * @returns The filesystem ref to the photo
   */
  public async cameraRollUriToFileSystemUri(
    { name, type }: { name: string; type: string },
    uri: string,
  ): Promise<string> {
    const filename = items.getItemDisplayName({ name, type });
    const iosPath = fileSystemService.tmpFilePath(filename);
    let path = uri;

    if (Platform.OS === 'ios') {
      await RNFS.copyAssetsFileIOS(uri, iosPath, 0, 0);
      path = iosPath;
    }

    return path;
  }

  /**
   * Creates a unique hash for the photo
   * @param userId User who owns the photo
   * @param name Name of the photo
   * @param timestamp timestamp of the photo creation
   * @param photoRef Photo ref pointing to a location in the file system
   * @returns {Buffer} A compound hash based on the three inputs
   */
  public async getPhotoHash(
    userId: string,
    name: string,
    timestamp: number,
    photoRef: PhotoFileSystemRef,
  ): Promise<Buffer> {
    // Implementation for sha256 is failing on Android, fallback to JS hash until we fix that
    const hash = Platform.OS === 'ios' ? createHash(HMAC.sha256) : crypto.createHash('sha256');

    // Add the userID to the hash
    hash.update(userId);

    // Add the photo name
    hash.update(name);

    // Add the photo takenAt date
    hash.update(new Date(timestamp).toISOString());

    // Add the content of the photo
    const contentHash = await RNFS.hash(photoRef, 'sha256');
    hash.update(contentHash);

    return hash.digest();
  }

  public getPhotoPath({ name, size, type }: { name: string; size: PhotoSizeType; type: string }) {
    if (size === PhotoSizeType.Full) {
      return `${PHOTOS_FULL_SIZE_DIRECTORY}/${name}.${type.toLowerCase()}`;
    }

    if (size === PhotoSizeType.Preview) {
      return `${PHOTOS_PREVIEWS_DIRECTORY}/${name}.${type.toLowerCase()}`;
    }

    throw new Error('Photo size is not recognized');
  }
}

export const photosUtils = new PhotosUtils();
