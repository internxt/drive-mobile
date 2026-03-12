export interface SharedFile {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
  size: number | null;
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

