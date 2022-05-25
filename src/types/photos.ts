import { Photo, Device, PhotoStatus, User } from '@internxt/sdk/dist/photos';
import CameraRoll from '@react-native-community/cameraroll';
import { NetworkCredentials } from '.';

export enum PhotosScreen {
  Permissions = 'photos-permissions',
  Gallery = 'photos-gallery',
}

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
  SyncStart = 'sync-start',
  DownloadTasksCalculated = 'sync-download-tasks-calculated',
  NewerUploadTasksPageCalculated = 'sync-newer-upload-tasks-page-calculated',
  OlderUploadTasksPageCalculated = 'sync-older-upload-tasks-page-calculated',
  SyncTasksCalculated = 'sync-tasks-calculated',
  SyncTaskSkipped = 'sync-task-skipped',
  CancelSync = 'sync-cancel',
  CancelSyncEnd = 'sync-cancel-end',
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

export interface SqlitePhotoRow {
  id: string;
  status: PhotoStatus;
  name: string;
  width: number;
  height: number;
  size: number;
  type: string;
  user_id: string;
  device_id: string;
  file_id: string;
  preview_id: string;
  taken_at: number;
  status_changed_at: number;
  created_at: number;
  updated_at: number;
  preview_path: string;
  hash: string;
}

export interface SqliteSyncRow {
  id: number;
  remote_sync_at: Date;
  newest_date: Date;
  oldest_date: Date | null;
}

export interface SqliteTmpCameraRollRow {
  id: number;
  modified: number;
  group_name: string;
  timestamp: number;
  type: string;
  filename: string;
  file_size: number;
  height: number;
  width: number;
  uri: string;
}

export type CreateSqliteTmpCameraRollRowData = Pick<
  SqliteTmpCameraRollRow,
  'group_name' | 'timestamp' | 'type' | 'filename' | 'file_size' | 'width' | 'height' | 'uri'
>;
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

export interface PhotosCameraRollGetPhotosResponse {
  edges: CameraRoll.PhotoIdentifier[];
  page_info: { has_next_page: boolean; start_cursor?: string | undefined; end_cursor?: string | undefined };
}
