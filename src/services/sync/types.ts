import { DeviceId, FileId } from '@internxt/sdk';

export interface Photo {
  id: string
  previewId: string
  deviceId: DeviceId
  fileId: FileId
  height: number
  width: number
  size: number
  type: string
  userId: string
  name: string
  status: 'EXISTS' | 'TRASH' | 'DELETED'
  createdAt: Date
  updatedAt: Date
}

export type BucketId = string;
export type PhotosUserId = string;
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
