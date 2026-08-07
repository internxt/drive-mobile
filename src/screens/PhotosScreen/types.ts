export type PhotoBackupState = 'loading' | 'backed' | 'not-backed' | 'uploading' | 'cloud-deleted';
export type PhotoMediaType = 'photo' | 'video';

export interface PhotoItem {
  id: string;
  type: 'local';
  uri?: string;
  createdAt: number;
  backupState: PhotoBackupState;
  mediaType: PhotoMediaType;
  duration?: string;
  isLivePhoto?: boolean;
  isBurst?: boolean;
  isBurstUploadIncomplete?: boolean;
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
  /** Time of the cloud day-folder this asset was discovered in. Used for timeline day-grouping. */
  folderDate: number;
  fileName: string;
  isLivePhoto?: boolean;
  // uuid of the paired .mov cloud asset (for isLivePhoto and cloud-only)
  pairedVideoRemoteFileId?: string;
  isBurst?: boolean;
  burstGroupId?: string;
  uploadedAt: number;
  isFavorite: boolean;
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
