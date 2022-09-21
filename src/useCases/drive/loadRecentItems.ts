import { DisplayableError } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import strings from 'assets/lang/strings';

export const loadRecentItems = async () => {
  try {
    return await drive.recents.getRecents();
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.recentsLoadError,
      report: {
        error,
      },
    });
  }
};
