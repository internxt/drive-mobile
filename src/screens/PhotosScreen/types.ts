export type PhotoBackupState = 'loading' | 'backed' | 'not-backed' | 'uploading';
export type PhotoMediaType = 'photo' | 'video';

export interface PhotoItem {
  id: string;
  type: 'local';
  uri?: string;
  createdAt: number;
  backupState: PhotoBackupState;
  mediaType: PhotoMediaType;
  duration?: string;
  uploadProgress?: number;
  isLivePhoto?: boolean;
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
  isLivePhoto?: boolean;
  // uuid of the paired .mov cloud asset (only present when isLivePhoto = true and on cloud-only items)
  pairedVideoRemoteFileId?: string;
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
