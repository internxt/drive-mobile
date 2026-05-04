export type PhotoBackupState = 'loading' | 'backed' | 'not-backed' | 'uploading';
export type PhotoMediaType = 'photo' | 'video';

export interface PhotoItem {
  id: string;
  uri?: string;
  backupState: PhotoBackupState;
  mediaType: PhotoMediaType;
  duration?: string;
  uploadProgress?: number;
}

export interface PhotoDateGroup {
  id: string;
  label: string;
  photos: PhotoItem[];
}

export type PhotosSyncStatus =
  | { type: 'fetching' }
  | { type: 'uploading' }
  | { type: 'paused' }
  | { type: 'completed' }
  | { type: 'synced' };

export type PhotosAccessState =
  | { type: 'available' }
  | { type: 'backup-off' }
  | { type: 'photos-locked' };
