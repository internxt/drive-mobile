import { NetworkCredentials } from '../../types';
import { PhotoFileSystemRef, PhotoSizeType, PhotosServiceModel } from '../../types/photos';
import { constants } from '../AppService';
import PhotosEventEmitter from './EventsService';
import PhotosLogService from './LogService';
import RNFS from 'react-native-fs';
import { PHOTOS_FULL_SIZE_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY } from './constants';
import { Platform } from 'react-native';
import { items } from '@internxt/lib';
import { createHash } from '@internxt/rn-crypto';
import { SdkManager } from '@internxt-mobile/services/common';
import * as crypto from 'react-native-crypto';
import fileSystemService from '../FileSystemService';
enum HMAC {
  sha256 = 'sha256',
  sha512 = 'sha512',
}
export class PhotosCommonServices {
  public static model: PhotosServiceModel;
  public sdk: SdkManager;
  public static log: PhotosLogService = new PhotosLogService(__DEV__ && process.env.NODE_ENV !== 'test');
  public static events: PhotosEventEmitter = new PhotosEventEmitter();

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public static initializeModel(accessToken: string, networkCredentials: NetworkCredentials) {
    PhotosCommonServices.model = {
      debug: constants.REACT_NATIVE_DEBUG,
      isInitialized: true,
      networkUrl: constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL || '',
      networkCredentials: networkCredentials,
      accessToken: accessToken,
    };
  }

  public static getPhotoPath({ name, size, type }: { name: string; size: PhotoSizeType; type: string }) {
    if (size === PhotoSizeType.Full) {
      return `${PHOTOS_FULL_SIZE_DIRECTORY}/${name}.${type.toLowerCase()}`;
    }

    if (size === PhotoSizeType.Preview) {
      return `${PHOTOS_PREVIEWS_DIRECTORY}/${name}.${type.toLowerCase()}`;
    }

    throw new Error('Photo size is not recognized');
  }

  /**
   * Creates a unique hash for the photo
   * @param userId User who owns the photo
   * @param name Name of the photo
   * @param timestamp timestamp of the photo creation
   * @param photoRef Photo ref pointing to a location in the file system
   * @returns {Buffer} A compound hash based on the three inputs
   */
  public static async getPhotoHash(
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

  /**
   * Gets the real uri pointing to the photo file
   *
   * @param data name and type of the photo
   * @param uri camera roll provided uri, usually something like asset://... or ph://...
   * @returns The filesystem ref to the photo
   */
  public static async cameraRollUriToFileSystemUri(
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
   * Gets the photo name
   *
   * @param filename  Filename usually provided by expo-media-library
   * @returns The photo name
   */
  public static getPhotoName(filename: string) {
    const nameWithExtension = filename;
    const nameWithoutExtension = nameWithExtension.substring(0, nameWithExtension.lastIndexOf('.'));

    return nameWithoutExtension;
  }

  /**
   * Gets the type of the photo
   *
   * @param filename Filename usually provided by expo-media-library
   * @returns The photo type, like jpg, png, heic
   */
  public static getPhotoType(filename: string) {
    const parts = filename.split('.');
    const extension = parts[parts.length - 1];

    return extension.toLowerCase();
  }
}

export const photosCommonServices = new PhotosCommonServices(SdkManager.getInstance());
