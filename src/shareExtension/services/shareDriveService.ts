import { SdkManager } from '../../services/common/sdk/SdkManager';
import { ShareFileItem, ShareFolderItem } from '../types';

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
  const sdk = SdkManager.getInstance();
  const [promise] = sdk.storageV2.getFolderFoldersByUuid(folderUuid, offset, PAGE_SIZE, 'plainName', 'ASC');
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
  const sdk = SdkManager.getInstance();
  const [promise] = sdk.storageV2.getFolderFilesByUuid(folderUuid, offset, PAGE_SIZE, 'plainName', 'ASC');
  const result = await promise;
  return {
    items: result.files.map(mapFile),
    hasMore: result.files.length >= PAGE_SIZE,
  };
};

const createFolder = async (parentFolderUuid: string, name: string): Promise<void> => {
  const sdk = SdkManager.getInstance();
  const result = sdk.storageV2.createFolderByUuid({ parentFolderUuid, plainName: name });
  if (!result) throw new Error('createFolder failed');
  await result[0];
};

export const shareDriveService = { getFolderFolders, getFolderFiles, createFolder };
