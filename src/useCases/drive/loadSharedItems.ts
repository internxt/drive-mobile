import drive from '@internxt-mobile/services/drive';
import { ListShareLinksItem, SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { UseCaseResult } from '../../types';
import errorService from '../../services/ErrorService';

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

    const sharedFoldersList = sharedFolders?.folders ?? [];
    const sharedFilesList = sharedFiles?.files ?? [];

    const sharedItems = [...sharedFoldersList, ...sharedFilesList] as (SharedFiles & SharedFolders)[];

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
