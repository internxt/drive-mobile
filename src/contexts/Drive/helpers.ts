import { driveFileService } from '@internxt-mobile/services/drive/file';
import { driveFolderService } from '@internxt-mobile/services/drive/folder';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { AsyncStorageKey } from '@internxt-mobile/types/index';
import { driveLocalDB } from '@internxt-mobile/services/drive/database';
import errorService from '@internxt-mobile/services/ErrorService';
import _ from 'lodash';

export const getModifiedDriveItemsAndUpdateLocalCache = async () => {
  const lastUpdatedAt = (await asyncStorageService.getItem(AsyncStorageKey.LastUpdatedAt)) ?? new Date().toISOString();

  const [modifiedFiles, modifiedFolders] = await Promise.all([
    driveFileService.getModifiedFiles({
      updatedAt: lastUpdatedAt,
      status: 'ALL',
    }),
    driveFolderService.getModifiedFolders({
      updatedAt: lastUpdatedAt,
      status: 'ALL',
    }),
  ]).catch((error) => {
    errorService.reportError(error);
    return [[], []];
  });

  if (!modifiedFiles || !modifiedFolders || (!modifiedFiles.length && !modifiedFolders.length)) return;

  const modifiedFilesUuids = modifiedFiles.map((file) => file.uuid);
  const modifiedFoldersUuids = modifiedFolders.map((folder) => folder.uuid);

  for (const modifiedFileUuid of modifiedFilesUuids) {
    await driveLocalDB.deleteItem({ uuid: modifiedFileUuid });
  }

  for (const modifiedFolderUuid of modifiedFoldersUuids) {
    await driveLocalDB.deleteFolderRecord(modifiedFolderUuid);
  }

  // Get the last updatedAt date from the modified files and folders
  let lastUpdatedAtFromModifiedFiles;
  let lastUpdatedAtFromModifiedFolders;

  if (modifiedFiles.length) lastUpdatedAtFromModifiedFiles = _.maxBy(modifiedFiles, 'updatedAt')?.updatedAt;

  if (modifiedFolders.length)
    lastUpdatedAtFromModifiedFolders = _.maxBy(modifiedFolders, 'updatedAt')?.updatedAt.toString();

  // Get the most recent date
  const newLastUpdatedAt = _.max([lastUpdatedAtFromModifiedFiles, lastUpdatedAtFromModifiedFolders]);

  await asyncStorageService.saveItem(AsyncStorageKey.LastUpdatedAt, newLastUpdatedAt ?? new Date().toISOString());
};
