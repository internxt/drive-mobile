import drive from '@internxt-mobile/services/drive';
import errors from '@internxt-mobile/services/ErrorService';
import { UseCaseResult } from '@internxt-mobile/types/index';
import { FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';

export const getFolderContent = async ({
  folderId,
}: {
  folderId: number;
}): Promise<UseCaseResult<FetchFolderContentResponse>> => {
  try {
    const folderContent = await drive.folder.getFolderContent(folderId);

    return {
      success: true,
      data: folderContent,
    };
  } catch (err) {
    errors.reportError(err);

    return {
      success: false,
      error: err as Error,
    };
  }
};
