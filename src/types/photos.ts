import { Photo, Device, User, PhotosItemType } from '@internxt/sdk/dist/photos/types';
import { FileSystemRef, NetworkCredentials } from '.';
import * as MediaLibrary from 'expo-media-library';
export enum GalleryViewMode {
  All = 'all',
}
export enum GalleryItemType {
  Image = 'image',
}

export enum PhotosSyncTaskType {
  Download = 'download',
  Upload = 'upload',
}

export enum PhotosSyncStatus {
  Unknown = 'unknown',
  Pending = 'pending',
  Calculating = 'calculating',
  Pausing = 'pausing',
  Paused = 'paused',
  InProgress = 'in-progress',
  Completed = 'completed',
  PullingRemotePhotos = 'pulling-remote-photos',
  NoPhotosToSync = 'no-photos-to-sync',
}

export const PHOTOS_DB_NAME = 'photos.db';

export enum PhotosEventKey {
  PhotoSyncDone = 'photo-sync-done',
  ResumeSync = 'sync-resume',
  RestartSync = 'sync-restart',
  PauseSync = 'sync-pause',
  ClearSync = 'sync-clear',
  RunningSync = 'sync-run',
  SyncTasksCalculated = 'sync-tasks-calculated',
  SyncCompleted = 'sync-completed',
}

export interface PhotosServiceModel {
  debug: boolean;
  isInitialized: boolean;
  accessToken: string;
  networkCredentials: NetworkCredentials;
  networkUrl: string;
  user?: User;
  device?: Device;
  syncAbort?: (reason?: string) => void;
}

export enum PhotoSizeType {
  Full = 'FULL_SIZE',
  Preview = 'PREVIEW',
}
export type PhotoFileSystemRef = FileSystemRef;

export interface PhotosSyncStatusData {
  status: PhotosSyncStatus;
  completedTasks: number;
  totalTasks: number;
}

export interface PhotosTaskCompletedInfo {
  isAlreadyOnTheDevice: boolean;
  previewPath: string;
}

export interface PhotosSyncInfo {
  totalTasks: number;
  downloadTasks: number;
  newerUploadTasks: number;
  olderUploadTasks: number;
}

export type PhotosByMonthType = {
  year: number;
  month: number;
  days: {
    day: number;
    photos: {
      data: Photo;
      preview: string;
    }[];
  }[];
};

export interface PhotosCollection {
  id: string;
  date: string;
  viewMode: GalleryViewMode;
  photos: Photo[];
}

export enum SyncDirection {
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
}

export enum SyncStage {
  UNKNOWN = 'UNKNOWN',
  NEEDS_REMOTE_CHECK = 'NEEDS_REMOTE_CHECK',
  IN_SYNC = 'IN_SYNC',
  FAILED_TO_CHECK = 'FAILED_TO_CHECK',
}
export interface PhotoSyncOperation {
  type: SyncDirection;
  photoId: string;
  previewRef: PhotoFileSystemRef;
  fullSizeRef: PhotoFileSystemRef;
}

export enum DevicePhotosSyncCheckerStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

export enum PhotosNetworkManagerStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

export enum PhotosSyncManagerStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
  PULLING_REMOTE_PHOTOS = 'PULLING_REMOTE_PHOTOS',
  NO_PHOTOS_TO_SYNC = 'NO_PHOTOS_TO_SYNC',
}

export enum PhotosRemoteSyncManagerStatus {
  SYNCING = 'SYNCING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
  SYNCED = 'SYNCED',
  ABORTED = 'ABORTED',
}

export enum PhotosNetworkOperationType {
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
}

export enum PhotosNetworkOperationResult {
  UNKNOWN = 'UNKNOWN',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface PhotosNetworkOperation {
  photosItem: PhotosItem;
  lastError?: Error;
  retries: number;
  onOperationCompleted: (err: Error | null, result: { photo: Photo; photosItem: PhotosItem } | null) => void;
}
export type DevicePhoto = MediaLibrary.Asset;

export enum DevicePhotosOperationPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
}

export interface DevicePhotoSyncCheckOperation {
  photosItem: PhotosItem;
  syncedPhoto?: Photo;
  createdAt: Date;
  lastTry?: Date;
  lastError?: Error;
  syncStage: SyncStage;
  priority: DevicePhotosOperationPriority;
}

export interface DevicePhotosSyncServiceHandlers {
  onOperationCompleted: (operation: DevicePhotoSyncCheckOperation) => void;
  onSyncQueueStatusChange: (status: DevicePhotosSyncCheckerStatus) => void;
}

export interface DevicePhotoRemoteCheck {
  devicePhoto: DevicePhoto;
  hash: string;
  photoRef: PhotoFileSystemRef;
  exists: boolean;
  photo?: Photo;
}

export enum PhotoSyncStatus {
  IN_SYNC_ONLY = 'in_sync_only',
  IN_DEVICE_ONLY = 'in_device_only',
  DEVICE_AND_IN_SYNC = 'device_and_in_sync',
  DELETED = 'deleted',
}

export type PhotosItem = {
  photoId: string | null;
  photoFileId: string | null;
  previewFileId: string | null;
  // name + takenAt + content hash makes a photo unique
  name: string;
  takenAt: number;
  updatedAt: number;
  width: number;
  height: number;
  format: string | 'unknown';
  type: PhotosItemType;
  duration?: number;
  localPreviewPath: PhotoFileSystemRef;
  localFullSizePath: PhotoFileSystemRef;
  status: PhotoSyncStatus;
  localUri: string | null;
  bucketId: string | null;
  getSize: () => Promise<number>;
  getDisplayName: () => string;
};

export type SerializedPhotosItem = Omit<PhotosItem, 'getSize' | 'getDisplayName'>;

export type PhotosItemBacked = PhotosItem & {
  photoId: string;
  photoFileId: string;
  previewFileId: string;
};
