import { photos } from '@internxt/sdk';
import { NetworkCredentials } from '../../types';
import { PhotoFileSystemRef, PhotoSizeType, PhotosServiceModel } from '../../types/photos';
import { constants } from '../AppService';
import PhotosEventEmitter from './EventsService';
import PhotosLogService from './LogService';
import RNFS from 'react-native-fs';
import { PHOTOS_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_TMP_DIRECTORY } from './constants';
import { Platform } from 'react-native';
import { items } from '@internxt/lib';

import { createHash } from 'react-native-crypto';

export class PhotosCommonServices {
  public static model: PhotosServiceModel;
  public static sdk: photos.Photos;
  public static log: PhotosLogService = new PhotosLogService(__DEV__);
  public static events: PhotosEventEmitter = new PhotosEventEmitter();

  public static initialize(accessToken: string) {
    PhotosCommonServices.sdk = new photos.Photos(constants.REACT_NATIVE_PHOTOS_API_URL || '', accessToken);
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

  public static getAccessToken() {
    return PhotosCommonServices.sdk?.accessToken;
  }

  public static getPhotoPath({ name, size, type }: { name: string; size: PhotoSizeType; type: string }) {
    if (size === PhotoSizeType.Full) {
      return `${PHOTOS_DIRECTORY}/${name}.${type}`;
    }

    if (size === PhotoSizeType.Preview) {
      return `${PHOTOS_PREVIEWS_DIRECTORY}/${name}.${type}`;
    }

    throw new Error('Photo size is not recognized');
  }

  /**
   * Creates a unique hash for the photo
   *
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
    const hash = createHash('sha256');
    hash.update(userId);
    hash.update(name);
    hash.update(timestamp);
    hash.update(await RNFS.hash(photoRef, 'sha256'));

    return await hash.digest();
  }

  /**
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
    const iosPath = `${PHOTOS_TMP_DIRECTORY}/${filename}`;
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

export const photosCommonServices = new PhotosCommonServices();
