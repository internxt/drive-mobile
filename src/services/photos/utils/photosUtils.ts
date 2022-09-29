import fileSystemService from '@internxt-mobile/services/FileSystemService';
import {
  DevicePhoto,
  PhotoFileSystemRef,
  PhotosItem,
  PhotosItemType,
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
import { Photo, PhotoStatus } from '@internxt/sdk/dist/photos';
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
      return `${PHOTOS_FULL_SIZE_DIRECTORY}/${name}.${type.toLowerCase()}`;
    }

    if (size === PhotoSizeType.Preview) {
      return `${PHOTOS_PREVIEWS_DIRECTORY}/${name}.${type.toLowerCase()}`;
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

      return {
        photoId: from.id,
        photoFileId: from.fileId,
        previewFileId: from.previewId,
        updatedAt: new Date(from.updatedAt).getTime(),
        name: from.name,
        takenAt: new Date(from.takenAt).getTime(),
        localPreviewPath: this.getPhotoPath({
          name: from.name,
          type: from.type,
          size: PhotoSizeType.Preview,
        }),
        localFullSizePath: fullSizePath,
        width: from.width,
        height: from.height,
        format: from.type,
        localUri: null,
        type: PhotosItemType.PHOTO,
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
      return {
        photoFileId: null,
        photoId: null,
        previewFileId: null,
        name,
        format,
        type: photo.mediaType === MediaType.photo ? PhotosItemType.PHOTO : PhotosItemType.VIDEO,
        takenAt: photo.creationTime,
        width: photo.width,
        height: photo.height,
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        localPreviewPath: photo.uri,
        localFullSizePath: photo.uri,
        updatedAt: photo.modificationTime,
        localUri: photo.uri,
        getSize: async () => {
          const path = await this.cameraRollUriToFileSystemUri(
            {
              name,
              type: format,
            },
            from.uri,
          );
          const stat = await fileSystemService.statRNFS(path);

          await fileSystemService.unlinkIfExists(path);
          return parseInt(stat.size);
        },
        getDisplayName() {
          return `${name}.${format.toLowerCase()}`;
        },
      };
    }
  }

  public getPhotoFormat(filename: string) {
    const parts = filename.split('.');
    const extension = parts[parts.length - 1];

    return extension.toLowerCase();
  }

  public mergePhotosItems(photosItems: PhotosItem[]) {
    const mapByName: { [name: string]: PhotosItem } = {};

    photosItems.forEach((photosItem) => {
      if (!mapByName[photosItem.name]) {
        mapByName[photosItem.name] = photosItem;
      }

      if (photosItem.status === PhotoSyncStatus.DELETED) {
        if (mapByName[photosItem.name]) {
          mapByName[photosItem.name].status = PhotoSyncStatus.DELETED;
        }
      }

      if (photosItem.status === PhotoSyncStatus.IN_SYNC_ONLY) {
        if (mapByName[photosItem.name] && mapByName[photosItem.name].status === PhotoSyncStatus.IN_DEVICE_ONLY) {
          mapByName[photosItem.name].photoFileId = photosItem.photoFileId;
          mapByName[photosItem.name].previewFileId = photosItem.previewFileId;
          mapByName[photosItem.name].photoId = photosItem.photoId;

          mapByName[photosItem.name].status = PhotoSyncStatus.DEVICE_AND_IN_SYNC;
        }
      }

      if (photosItem.status === PhotoSyncStatus.IN_DEVICE_ONLY) {
        if (mapByName[photosItem.name] && mapByName[photosItem.name].status === PhotoSyncStatus.IN_SYNC_ONLY) {
          mapByName[photosItem.name].localFullSizePath = photosItem.localUri as string;
          mapByName[photosItem.name].localPreviewPath = photosItem.localUri as string;
          mapByName[photosItem.name].localUri = photosItem.localUri;
          mapByName[photosItem.name].status = PhotoSyncStatus.DEVICE_AND_IN_SYNC;
        }
      }
    });

    const asArray = Object.values(mapByName);

    return asArray
      .filter((del) => del.status !== PhotoSyncStatus.DELETED)
      .sort((p1, p2) => {
        if (p1.takenAt > p2.takenAt) return -1;
        if (p1.takenAt < p2.takenAt) return 1;
        return 0;
      });
  }
}

export const photosUtils = new PhotosUtils();
