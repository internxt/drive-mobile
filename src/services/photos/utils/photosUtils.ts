import fileSystemService from '@internxt-mobile/services/FileSystemService';
import {
  DevicePhoto,
  PhotoFileSystemRef,
  PhotosItem,
  PhotoSizeType,
  PhotoSyncStatus,
} from '@internxt-mobile/types/photos';
import { items } from '@internxt/lib';
import { createHash } from '@internxt/rn-crypto';
import { HMAC } from '@internxt/rn-crypto/src/types/crypto';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as crypto from 'react-native-crypto';
import { PHOTOS_FULL_SIZE_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY } from '../constants';
import { MediaType } from 'expo-media-library';

import { Photo, PhotoPreviewType, PhotosItemType, PhotoStatus } from '@internxt/sdk/dist/photos';
export class PhotosUtils {
  /**
   * Gets the type of the photo
   *
   * @param filename Filename usually provided by expo-media-library
   * @returns The photo type, like jpg, png, heic
   */
  public getPhotoType(filename: string): string | 'unknown' {
    if (filename.includes('.')) {
      const parts = filename.split('.');
      const extension = parts[parts.length - 1];

      return extension.toLowerCase();
    }

    return 'unknown';
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
  public async cameraRollUriToFileSystemUri({
    name,
    format,
    itemType,
    uri,
    destination,
  }: {
    name: string;
    format: string;
    itemType: PhotosItemType;
    destination?: string;
    uri: string;
  }): Promise<string> {
    const filename = items.getItemDisplayName({ name, type: format });
    const iosPath = destination || fileSystemService.tmpFilePath(filename);
    let path = uri;

    if (Platform.OS === 'ios' && uri.startsWith('ph://')) {
      await fileSystemService.unlinkIfExists(iosPath);

      if (itemType === PhotosItemType.PHOTO) {
        await RNFS.copyAssetsFileIOS(uri, iosPath, 0, 0);
      }

      if (itemType === PhotosItemType.VIDEO) {
        await RNFS.copyAssetsVideoIOS(uri, iosPath);
      }

      path = iosPath;
    }

    return fileSystemService.uriToPath(path);
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
      return `${PHOTOS_FULL_SIZE_DIRECTORY}/${name}${type === 'unknown' || !type ? '' : '.' + type}`;
    }

    if (size === PhotoSizeType.Preview) {
      return `${PHOTOS_PREVIEWS_DIRECTORY}/${name}${type === 'unknown' || !type ? '' : '.' + type}`;
    }

    throw new Error('Photo size is not recognized');
  }

  public getPhotosItem(from: Photo | DevicePhoto): PhotosItem {
    // This is a remote photo, build a syncrhonizable photo from it
    if ('fileId' in from) {
      const fullSizePath = this.getPhotoPath({
        name: from.name,
        type: from.type,
        size: PhotoSizeType.Full,
      });

      const previewType = from.previews ? from.previews[0].type : ('JPEG' as PhotoPreviewType);

      return {
        photoId: from.id,
        photoFileId: from.fileId,
        previewFileId: from.previews && from.previews[0].fileId ? from.previews[0].fileId : from.previewId,
        updatedAt: new Date(from.updatedAt).getTime(),
        name: from.name,
        takenAt: new Date(from.takenAt).getTime(),
        localPreviewPath: this.getPhotoPath({
          name: from.name,
          type: previewType,
          size: PhotoSizeType.Preview,
        }),
        localFullSizePath: fullSizePath,
        width: from.width,
        height: from.height,
        format: from.type,
        localUri: null,
        duration: from.duration,
        type: from.itemType || PhotosItemType.PHOTO,
        // TODO: Add the networkBucketId type to the SDK
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        bucketId: from.networkBucketId,
        status: from.status !== PhotoStatus.Exists ? PhotoSyncStatus.DELETED : PhotoSyncStatus.IN_SYNC_ONLY,
        getDisplayName() {
          return `${from.name}.${from.type.toLowerCase()}`;
        },

        getSize: async () => from.size,
      };
    } else {
      const photo = from as DevicePhoto;

      const name = this.getPhotoName(photo.filename);
      const format = this.getPhotoFormat(photo.filename);
      const itemType = photo.mediaType === MediaType.photo ? PhotosItemType.PHOTO : PhotosItemType.VIDEO;
      return {
        photoFileId: null,
        photoId: null,
        previewFileId: null,
        name,
        format,
        type: itemType,
        takenAt: photo.creationTime,
        width: photo.width,
        height: photo.height,
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        localPreviewPath: photo.uri,
        localFullSizePath: photo.uri,
        updatedAt: photo.modificationTime,
        localUri: photo.uri,
        bucketId: null,
        getSize: async () => {
          const path = await this.cameraRollUriToFileSystemUri({
            name,
            format,
            itemType,
            uri: from.uri,
            destination: this.getPhotoPath({
              name: name,
              type: format,
              size: PhotoSizeType.Full,
            }),
          });
          const stat = await fileSystemService.statRNFS(path);

          await fileSystemService.unlinkIfExists(path);
          return stat.size;
        },
        duration: photo.duration,
        getDisplayName() {
          return `${name}.${format.toLowerCase()}`;
        },
      };
    }
  }

  public getPhotoFormat(filename: string): string | 'unknown' {
    if (filename.includes('.')) {
      const parts = filename.split('.');
      const extension = parts[parts.length - 1];

      return extension.toLowerCase();
    }

    return 'unknown';
  }

  public mergePhotosItems(photosItems: PhotosItem[]) {
    const mapByName: { [key: string]: PhotosItem } = {};

    photosItems.forEach((photosItem) => {
      const key = `${photosItem.name}-${photosItem.takenAt}`;

      if (!mapByName[key]) {
        mapByName[key] = photosItem;
      }

      if (photosItem.status === PhotoSyncStatus.DELETED) {
        if (mapByName[key]) {
          mapByName[key].status = PhotoSyncStatus.DELETED;
        }
      }

      // Photo is in server
      if (photosItem.status === PhotoSyncStatus.IN_SYNC_ONLY) {
        if (mapByName[key] && mapByName[key].status === PhotoSyncStatus.IN_DEVICE_ONLY) {
          mapByName[key].photoFileId = photosItem.photoFileId;
          mapByName[key].previewFileId = photosItem.previewFileId;
          mapByName[key].photoId = photosItem.photoId;
          mapByName[key].takenAt = photosItem.takenAt;
          mapByName[key].status = PhotoSyncStatus.DEVICE_AND_IN_SYNC;
        }
      }

      // Photo is in device
      if (photosItem.status === PhotoSyncStatus.IN_DEVICE_ONLY) {
        if (mapByName[key] && mapByName[key].status === PhotoSyncStatus.IN_SYNC_ONLY) {
          mapByName[key].localFullSizePath = photosItem.localUri as string;
          mapByName[key].localPreviewPath = photosItem.localUri as string;
          mapByName[key].localUri = photosItem.localUri;
          mapByName[key].status = PhotoSyncStatus.DEVICE_AND_IN_SYNC;
        }
      }
    });

    const asArray = Object.values(mapByName);

    const noDeleted = asArray.filter((del) => del.status !== PhotoSyncStatus.DELETED);

    return noDeleted.sort((p1, p2) => {
      if (p1.takenAt > p2.takenAt) return -1;
      if (p1.takenAt < p2.takenAt) return 1;
      return 0;
    });
  }
}

export const photosUtils = new PhotosUtils();
