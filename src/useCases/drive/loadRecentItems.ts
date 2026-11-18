import { DisplayableError } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import { RecentListFile } from '@internxt-mobile/types/drive/file';
import strings from 'assets/lang/strings';

export const loadRecentItems = async (): Promise<RecentListFile[]> => {
  try {
    const recents = await drive.recents.getRecents();
    const recentsParsed = recents.map((recent) => ({
      ...recent,
      name: recent.plainName,
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
