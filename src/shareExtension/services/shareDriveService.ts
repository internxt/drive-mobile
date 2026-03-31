import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { getUniqueFilename } from '../../services/drive/file/utils/getUniqueFilename';
import { ShareFileItem, ShareFolderItem } from '../types';
import ShareSdkManager from './ShareSdkManager';

const PAGE_SIZE = 50;

const mapFolder = (folder: { uuid: string; plainName: string; updatedAt: string }): ShareFolderItem => ({
  uuid: folder.uuid,
  plainName: folder.plainName,
  updatedAt: folder.updatedAt,
});

const mapFile = (file: {
  uuid: string;
  plainName: string;
  size: string;
  type?: string | null;
  updatedAt: string;
}): ShareFileItem => ({
  uuid: file.uuid,
  plainName: file.plainName,
  size: file.size,
  type: file.type ?? '',
  updatedAt: file.updatedAt,
});

const getFolderFolders = async (
  folderUuid: string,
  offset: number,
): Promise<{ items: ShareFolderItem[]; hasMore: boolean }> => {
  const [promise] = ShareSdkManager.storageV2.getFolderFoldersByUuid(folderUuid, offset, PAGE_SIZE, 'plainName', 'ASC');
  const result = await promise;
  return {
    items: result.folders.map(mapFolder),
    hasMore: result.folders.length >= PAGE_SIZE,
  };
};

const getFolderFiles = async (
  folderUuid: string,
  offset: number,
): Promise<{ items: ShareFileItem[]; hasMore: boolean }> => {
  const [promise] = ShareSdkManager.storageV2.getFolderFilesByUuid(folderUuid, offset, PAGE_SIZE, 'plainName', 'ASC');
  const result = await promise;
  return {
    items: result.files.map(mapFile),
    hasMore: result.files.length >= PAGE_SIZE,
  };
};

const createFolder = async (parentFolderUuid: string, name: string): Promise<void> => {
  const result = ShareSdkManager.storageV2.createFolderByUuid({ parentFolderUuid, plainName: name });
  if (!result) throw new Error('createFolder failed');
  await result[0];
};

const checkDuplicatedFiles = async (
  folderUuid: string,
  filesList: { plainName: string; type: string }[],
): Promise<DriveFileData[]> => {
  if (filesList.length === 0) return [];
  const response = await ShareSdkManager.storageV2.checkDuplicatedFiles({ folderUuid, filesList });
  return response.existentFiles;
};

const trashFiles = async (fileUuids: string[]): Promise<void> => {
  if (fileUuids.length === 0) return;
  await ShareSdkManager.trashV2.addItemsToTrash({
    items: fileUuids.map((uuid) => ({ uuid, type: 'file' })),
  });
};

const getUniqueFilenameInFolder = async (
  plainName: string,
  extension: string,
  existingDuplicates: DriveFileData[],
  folderUuid: string,
): Promise<string> => getUniqueFilename(plainName, extension, existingDuplicates, folderUuid, checkDuplicatedFiles);

export const shareDriveService = {
  getFolderFolders,
  getFolderFiles,
  createFolder,
  checkDuplicatedFiles,
  trashFiles,
  getUniqueFilename: getUniqueFilenameInFolder,
};
