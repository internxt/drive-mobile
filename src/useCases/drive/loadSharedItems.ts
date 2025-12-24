import drive from '@internxt-mobile/services/drive';
import { DriveFileData } from '@internxt-mobile/types/drive/file';
import { DriveFolderData } from '@internxt-mobile/types/drive/folder';
import { ListShareLinksItem, SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { UseCaseResult } from '../../types';
import errorService from '../../services/ErrorService';
import { mapSharedFile, mapSharedFolder } from '../../helpers/driveItemMappers';

const ITEMS_PER_PAGE = 50;

export type SharedLinkResult = ListShareLinksItem & { item: DriveFileData | DriveFolderData };

export type AdvancedSharedItem = SharedFolders &
  SharedFiles & {
    isFolder: boolean;
    isRootLink: boolean;
    credentials: {
      networkPass: string;
      networkUser: string;
    };
    sharingId?: string;
    sharingType: 'public' | 'private';
  };

/**
 * Gets all shared items available
 *
 * @returns A list of DriveItems
 */
export const getSharedItems = async ({
  page,
  shouldGetFolders,
  shouldGetFiles,
}: {
  page: number;
  shouldGetFolders: boolean;
  shouldGetFiles: boolean;
}): Promise<
  UseCaseResult<{ items: (SharedFiles & SharedFolders)[]; hasMoreFiles: boolean; hasMoreFolders: boolean }>
> => {
  try {
    const [sharedFolders, sharedFiles] = await Promise.all([
      shouldGetFolders ? drive.share.getSharedFolders({ page, perPage: ITEMS_PER_PAGE }) : null,
      shouldGetFiles ? drive.share.getSharedFiles({ page, perPage: ITEMS_PER_PAGE }) : null,
    ]);

    const sharedFoldersList = (sharedFolders?.folders ?? []).map(mapSharedFolder);
    const sharedFilesList = (sharedFiles?.files ?? []).map(mapSharedFile);

    const sharedItems = [...sharedFoldersList, ...sharedFilesList] as (SharedFiles & SharedFolders & { isFolder: boolean })[];

    return {
      success: true,
      data: {
        items: sharedItems,
        hasMoreFolders: sharedFoldersList.length >= ITEMS_PER_PAGE,
        hasMoreFiles: sharedFilesList.length >= ITEMS_PER_PAGE,
      },
    };
  } catch (error) {
    errorService.reportError(error);
    return {
      success: false,
      error: error as Error,
    };
  }
};
