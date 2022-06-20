import { photos } from '@internxt/sdk';
import { NetworkCredentials } from '../../types';
import { PhotoFileSystemRef, PhotosServiceModel } from '../../types/photos';
import { constants } from '../AppService';
import PhotosEventEmitter from './EventsService';
import PhotosLogService from './LogService';
import RNFS from 'react-native-fs';
import { createHash } from 'react-native-crypto';
import { PHOTOS_TMP_DIRECTORY } from './constants';
import { Platform } from 'react-native';
import { items } from '@internxt/lib';

export class PhotosCommonServices {
  public static model: PhotosServiceModel = {
    debug: constants.REACT_NATIVE_DEBUG,
    isInitialized: false,
    networkUrl: constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL || '',
  };
  public static sdk?: photos.Photos;
  public static log: PhotosLogService = new PhotosLogService(PhotosCommonServices.model.debug);
  public static events: PhotosEventEmitter = new PhotosEventEmitter();
  public static instance?: PhotosCommonServices;

  public static initialize(accessToken: string, networkCredentials: NetworkCredentials) {
    if (PhotosCommonServices.instance) return PhotosCommonServices.instance;

    PhotosCommonServices.instance = new PhotosCommonServices();
    PhotosCommonServices.model.networkCredentials = networkCredentials;
    PhotosCommonServices.model.accessToken = accessToken;
    PhotosCommonServices.sdk = new photos.Photos(constants.REACT_NATIVE_PHOTOS_API_URL || '', accessToken);
  }

  /**
   *
   * @param name Name of the photo
   * @param timestamp timestamp of the photo
   * @param photoRef Photo ref pointing to a location in the file system
   * @returns A compound hash based on the three inputs
   */
  public static async getPhotoHash(userId: string, name: string, timestamp: number, photoRef: PhotoFileSystemRef) {
    const hash = createHash('sha256');
    hash.update(userId);
    hash.update(name);
    hash.update(timestamp);
    hash.update(await RNFS.hash(photoRef, 'sha256'));
    return hash.digest('hex');
  }

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

  public static getPhotoName(filename: string) {
    const nameWithExtension = filename as string;
    const nameWithoutExtension = nameWithExtension.substring(0, nameWithExtension.lastIndexOf('.'));

    return nameWithoutExtension;
  }
}

export const photosCommonServices = new PhotosCommonServices();
