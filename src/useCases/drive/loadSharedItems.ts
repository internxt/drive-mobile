import { DisplayableError } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import { ListShareLinksItem } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import strings from 'assets/lang/strings';

export type SharedLinkResult = ListShareLinksItem & { item: DriveFileData | DriveFolderData };
export const loadSharedLinks = async () => {
  try {
    const response = await drive.share.getShareLinks();

    return response.items.filter((item) => item.item) as SharedLinkResult[];
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.sharedLoadError,
      report: {
        error,
      },
    });
  }
};
