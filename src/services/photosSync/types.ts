import { DeviceId, FileId } from '@internxt/sdk/dist/photos';

export type UserId = string;
export type Base64 = string;

export interface User {
  id: UserId;
  uuid: string;
  bucketId: BucketId;
}

export enum PhotoStatus {
  Exists = 'EXISTS',
  Trashed = 'TRASHED',
  Deleted = 'DELETED',
}

export interface Photo {
  id: string;
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
  fileId: FileId;
  previewId: FileId;
  deviceId: DeviceId;
  userId: UserId;
  status: PhotoStatus;
  lastStatusChangeAt: Date;
  creationDate: Date;
}

export type DeviceName = string;
export type DeviceMac = string;

export interface Device {
  id: DeviceId;
  mac: DeviceMac;
  name: DeviceName;
  userId: UserId;
}

export type BucketId = string;
export type NewPhoto = Omit<Photo, 'id' | 'fileId' | 'previewId' | 'status' | 'lastStatusChangeAt'> & { URI: string };
export type NewPhotoUploadedOnlyNetwork = Omit<NewPhoto, 'URI'> & Pick<Photo, 'fileId' | 'previewId'>;

// TODO: Move to inxt-js
export type Mnemonic = string;
export type NetworkUser = string;
export type NetworkPass = string;
export interface NetworkCredentials {
  encryptionKey: Mnemonic;
  user: NetworkUser;
  pass: NetworkPass;
}
