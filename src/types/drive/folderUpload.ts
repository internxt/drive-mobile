export interface FolderTreeNode {
  /** Relative path from the root of the selected folder (e.g. 'photos/vacation') */
  relativePath: string;
  parentPath: string;
  name: string;
  isDirectory: boolean;
  size: number;
  /**
   * Absolute URI:
   * - iOS:     file:// path accessible via RNFS
   * - Android: content:// SAF URI
   */
  uri: string;
}
export interface FolderTree {
  dirs: FolderTreeNode[];
  files: FolderTreeNode[];
}

export interface FolderUploadProgress {
  folderName: string;
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
}

export type FolderUploadStatus = 'scanning' | 'uploading' | 'cancelled' | 'completed' | 'error';

export interface FolderUploadState {
  uploadId: string;
  folderName: string;
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  status: FolderUploadStatus;
  startedAt: number;
}

export interface FolderUploadResult {
  totalFiles: number;
  uploadedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  totalFolders: number;
  createdFolders: number;
  failedFolders: number;
  cancelled: boolean;
}

export type UploadFileCallback = (
  fileNode: FolderTreeNode,
  parentFolderUuid: string,
  signal: AbortSignal,
) => Promise<void>;
