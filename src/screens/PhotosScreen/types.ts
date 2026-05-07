export type PhotoBackupState = 'loading' | 'backed' | 'not-backed' | 'uploading';
export type PhotoMediaType = 'photo' | 'video';

export interface PhotoItem {
  id: string;
  type: 'local';
  uri?: string;
  backupState: PhotoBackupState;
  mediaType: PhotoMediaType;
  duration?: string;
  uploadProgress?: number;
}

export interface CloudPhotoItem {
  id: string;
  type: 'cloud-only';
  mediaType: PhotoMediaType;
  thumbnailPath: string | null;
  thumbnailBucketId: string | null;
  thumbnailBucketFile: string | null;
  thumbnailType: string | null;
  deviceId: string;
  createdAt: number;
  fileName: string;
}

export type TimelinePhotoItem = PhotoItem | CloudPhotoItem;

export interface PhotoDateGroup {
  id: string;
  label: string;
  photos: TimelinePhotoItem[];
}

export type PhotosSyncStatus =
  | { type: 'fetching' }
  | { type: 'uploading' }
  | { type: 'paused' }
  | { type: 'completed' }
  | { type: 'synced' };

export type PhotosAccessState = { type: 'available' } | { type: 'backup-off' } | { type: 'photos-locked' };
