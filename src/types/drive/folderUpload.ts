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
