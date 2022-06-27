import { Photo, PhotoStatus } from '@internxt/sdk/dist/photos';
import { MediaType } from 'expo-media-library';
import { DevicePhoto } from '../../../src/types/photos';

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
    ...data,
  };
};
