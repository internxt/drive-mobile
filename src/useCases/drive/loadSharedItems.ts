import drive from '@internxt-mobile/services/drive';
import {
  ListAllSharedFoldersResponse,
  ListShareLinksItem,
  SharedFiles,
  SharedFolders,
} from '@internxt/sdk/dist/drive/share/types';
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
      shouldGetFolders
        ? drive.share.getSharedFolders({ page, perPage: ITEMS_PER_PAGE })
        : Promise.resolve<ListAllSharedFoldersResponse>({
            credentials: {
              networkPass: '',
              networkUser: '',
            },
            files: [],
            folders: [],
            token: '',
          }),
      shouldGetFiles
        ? drive.share.getSharedFiles({ page, perPage: ITEMS_PER_PAGE })
        : Promise.resolve<ListAllSharedFoldersResponse>({
            credentials: {
              networkPass: '',
              networkUser: '',
            },
            files: [],
            folders: [],
            token: '',
          }),
    ]);

    const sharedItems = [...sharedFolders.folders, ...sharedFiles.files] as (SharedFiles & SharedFolders)[];

    return {
      success: true,
      data: {
        items: sharedItems,
        hasMoreFolders: sharedFolders.folders.length > 0,
        hasMoreFiles: sharedFiles.files.length > 0,
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
