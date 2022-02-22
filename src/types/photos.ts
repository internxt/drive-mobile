import { Photo, Device, PhotoStatus, User } from '@internxt/sdk/dist/photos';
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
  InProgress = 'in-progress',
  Completed = 'completed',
}

export const PHOTOS_DB_NAME = 'photos.db';

export interface PhotosServiceModel {
  debug: boolean;
  isInitialized: boolean;
  accessToken: string;
  networkCredentials: NetworkCredentials;
  networkUrl: string;
  user?: User;
  device?: Device;
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
  fileSize: number;
  height: number;
  width: number;
  uri: string;
}

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
