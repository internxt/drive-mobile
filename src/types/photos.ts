import { PhotoStatus, User } from '@internxt/sdk/dist/photos';
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

export const PHOTOS_DB_NAME = 'photos.db';

export interface PhotosServiceModel {
  accessToken: string;
  networkCredentials: NetworkCredentials;
  networkUrl: string;
  user?: User;
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
  preview_source: string;
}

export interface PhotosSyncStatus {
  completedTasks: number;
  totalTasks: number;
}

export interface PhotosSyncTasksInfo {
  totalTasks: number;
  downloadTasks: number;
  uploadTasks: number;
}
