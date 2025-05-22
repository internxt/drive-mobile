import { DisplayableError } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import strings from 'assets/lang/strings';

export const loadRecentItems = async (): Promise<DriveFileData[]> => {
  try {
    const recents = await drive.recents.getRecents();
    const recentsParsed = recents.map((recent) => ({
      ...recent,
      name: recent.plainName ?? recent.name,
    }));
    return recentsParsed;
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.recentsLoadError,
      report: {
        error,
      },
    });
  }
};
