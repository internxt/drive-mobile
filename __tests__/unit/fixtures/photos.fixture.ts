import { Photo, PhotoStatus, PhotosItemType } from '@internxt/sdk/dist/photos';
import { MediaType } from 'expo-media-library';
import { DevicePhoto, PhotosItem, PhotoSyncStatus } from '../../../src/types/photos';

export const createDevicePhotoFixture = (data?: Partial<DevicePhoto>): DevicePhoto => {
  const timestamp = Date.now().toString();
  const filename = `${timestamp}_file.jpg`;
  return {
    id: timestamp,
    filename,
    uri: `/root/${filename}`,
    width: 512,
    height: 512,
    mediaType: MediaType.photo,
    creationTime: Date.now(),
    modificationTime: Date.now() - 10000,
    duration: 0,
    ...data,
  };
};

export const createPhotoFixture = (data?: Partial<Photo>): Photo => {
  const timestamp = Date.now().toString();
  return {
    id: timestamp,
    name: 'new_photo',
    type: 'jpg',
    size: 999,
    width: 512,
    height: 512,
    fileId: timestamp,
    previewId: `preview_${timestamp}`,
    deviceId: `device_${timestamp}`,
    userId: `user_${timestamp}`,
    status: PhotoStatus.Exists,
    statusChangedAt: new Date(),
    hash: 'xxx',
    takenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    itemType: PhotosItemType.PHOTO,
    ...data,
  };
};

export const createPhotosItemFixture = (data?: Partial<PhotosItem>): PhotosItem => {
  const name = `photo_${Date.now()}`;
  const format = 'jpg';
  return {
    name,
    format,
    takenAt: Date.now() - 1000,
    updatedAt: Date.now() - 100,
    width: 2000,
    height: 1000,
    type: PhotosItemType.PHOTO,
    localPreviewPath: `/documents/photos/previews/${name}.${format}`,
    localFullSizePath: `/documents/photos/full/${name}.${format}`,
    status: PhotoSyncStatus.IN_SYNC_ONLY,
    localUri: `/documents/photos/previews/${name}.${format}`,
    getSize: async () => 1024,
    photoId: Date.now().toString(),
    photoFileId: (Date.now() - 500).toString(),
    previewFileId: (Date.now() - 300).toString(),
    getDisplayName: () => `${name}.${format}`,
    duration: undefined,
    bucketId: null,
    ...data,
  };
};
