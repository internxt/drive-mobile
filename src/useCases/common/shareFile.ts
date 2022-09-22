import { DisplayableError } from '@internxt-mobile/services/common';

import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { FileSystemRef } from '@internxt-mobile/types/index';
import strings from 'assets/lang/strings';
import { ShareOpenResult } from 'react-native-share/lib/typescript/types';

export const shareFile = async ({
  title,
  filePath,
}: {
  title: string;
  filePath: FileSystemRef;
}): Promise<ShareOpenResult> => {
  try {
    return fileSystemService.shareFile({
      title,
      fileUri: filePath,
    });
  } catch (error) {
    throw new DisplayableError({
      userFriendlyMessage: strings.errors.generic.message,
      report: {
        error,
      },
    });
  }
};
