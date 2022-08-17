import { Photo, Device, User } from '@internxt/sdk/dist/photos';
import { FileSystemRef, NetworkCredentials } from '.';
import * as MediaLibrary from 'expo-media-library';
export enum GalleryViewMode {
  Years = 'years',
  Months = 'months',
  Days = 'days',
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
  EMPTY = 'EMPTY',
  COMPLETED = 'COMPLETED',
}

export enum PhotosSyncManagerStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
  EMPTY = 'EMPTY',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

export enum PhotosNetworkManagerStatus {
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  IDLE = 'IDLE',
  EMPTY = 'EMPTY',
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
  devicePhoto: DevicePhoto;
  hash: string;
  photoRef: PhotoFileSystemRef;
  lastError?: Error;
  uploadedPhoto?: Photo;
  result: PhotosNetworkOperationResult;
  onOperationCompleted: (err: Error | null, photo: Photo | null) => void;
}
export type DevicePhoto = MediaLibrary.Asset;

export enum DevicePhotosOperationPriority {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
}

export interface DevicePhotoSyncCheckOperation {
  id: string;
  devicePhoto: DevicePhoto;
  uploadedPhoto?: Photo;
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

export type PhotoWithPreview = Photo & { resolvedPreview: string | null };
