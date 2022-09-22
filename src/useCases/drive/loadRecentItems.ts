import { DisplayableError } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import strings from 'assets/lang/strings';

export const loadRecentItems = (): Promise<DriveFileData[]> => {
  try {
    return drive.recents.getRecents();
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.recentsLoadError,
      report: {
        error,
      },
    });
  }
};
