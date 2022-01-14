import { PhotoStatus, User } from '@internxt/sdk/dist/photos';
import { NetworkCredentials } from '.';

export enum PhotosScreen {
  Permissions = 'photos-permissions',
  Gallery = 'photos-gallery',
  Preview = 'photos-preview',
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
  taken_at: Date;
  status_changed_at: Date;
  created_at: Date;
  updated_at: Date;
  preview: string;
}

export interface SqlitePhotoSourceRow {
  id: number;
  photo_id: string;
  preview_source: string;
  photo_source: string | null;
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
