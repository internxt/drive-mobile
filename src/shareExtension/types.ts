export interface SharedFile {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
  size: number | null;
  phAssetId?: string; // iOS only: PHAsset localIdentifier
}

export interface ShareFolderItem {
  uuid: string;
  plainName: string;
  updatedAt: string;
}

export interface ShareFileItem {
  uuid: string;
  plainName: string;
  size: string;
  type: string;
  updatedAt: string;
}

export type DriveViewMode = 'grid' | 'list';

export type UploadStatus = 'idle' | 'checking' | 'uploading' | 'success' | 'error' | 'conflict';

export type NameCollisionAction = 'replace' | 'keep-both';

export type UploadErrorType =
  | 'general'
  | 'no_internet'
  | 'session_expired'
  | 'prep_failed'
  | 'file_already_exists';

export interface UploadProgress {
  currentFile: number;
  totalFiles: number;
  bytesUploaded: number;
  currentFileSize: number;
}

export interface CollisionState {
  visible: boolean;
  itemNameWithoutExtension: string;
  collisionCount: number;
}
