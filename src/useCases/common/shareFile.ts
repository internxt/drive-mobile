import { DisplayableError } from '@internxt-mobile/services/common';

import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { FileSystemRef } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';

export const shareFile = async ({ title, filePath }: { title: string; filePath: FileSystemRef }): Promise<boolean> => {
  try {
    const result = await fileSystemService.shareFile({
      title,

      fileUri: filePath,
    });

    return result.success;
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.generic.message,
      report: {
        error,
      },
    });
  }
};
