import { DocumentPickerResponse } from 'react-native-document-picker';

/**
 * UPLOAD TYPES
 */

/**
 * Extended DocumentPickerResponse with file metadata timestamps.
 * Used during file upload process to preserve original creation and modification times.
 */
export type DocumentPickerFile = DocumentPickerResponse & {
  modificationTime?: string;
  creationTime?: string;
};

/**
 * File prepared and ready to be uploaded
 */
export interface FileToUpload {
  name: string;
  uri: string;
  size: number;
  type: string;
  parentUuid: string;
  modificationTime?: string;
  creationTime?: string;
}

/**
 * File currently being uploaded
 */
export interface UploadingFile {
  id: number;
  uuid: string;
  uri: string;
  name: string;
  type: string;
  parentId: number;
  parentUuid: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  progress: number;
  uploaded: boolean;
  modificationTime?: string;
  creationTime?: string;
}

/**
 * DOWNLOAD TYPES
 */

/**
 * File currently being downloaded (tracked in state)
 */
export interface DownloadingFile {
  data: {
    id: number;
    fileId: string;
    name: string;
    type: string;
    size: number;
    updatedAt: string;
  };
  downloadProgress: number;
  decryptProgress: number;
  downloadedFilePath?: string;
  error?: string;
  retry?: () => Promise<void>;
  status: 'idle' | 'cancelling' | 'cancelled';
}

/**
 * CONSTANTS
 */
const GB = 1024 * 1024 * 1024;
export const UPLOAD_FILE_SIZE_LIMIT = 5 * GB;
export const DRIVE_DB_NAME = 'drive.db';
