import { DeviceId, FileId } from '@internxt/sdk';

export type UserId = string;
export interface User {
  id: UserId;
  uuid: string
  bucketId: BucketId
}

export interface Photo {
  id: string
  previewId: string
  deviceId: DeviceId
  fileId: FileId
  height: number
  width: number
  size: number
  type: string
  userId: UserId
  name: string
  status: 'EXISTS' | 'TRASH' | 'DELETED'
  createdAt: Date
  updatedAt: Date
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
export type NewPhoto = Pick<Photo,
  'name' | 'deviceId' | 'height' | 'width' | 'size' | 'type' | 'userId'
> & { URI: string };

// TODO: Move to inxt-js
export type Mnemonic = string;
export type NetworkUser = string;
export type NetworkPass = string;
export interface NetworkCredentials {
  encryptionKey: Mnemonic
  user: NetworkUser
  pass: NetworkPass
}
