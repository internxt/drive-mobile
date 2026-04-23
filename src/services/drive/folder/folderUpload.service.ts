import { logger } from '@internxt-mobile/services/common';
import { errorCodes, isErrorWithCode, pickDirectory } from '@react-native-documents/picker';
import strings from '../../../../assets/lang/strings';
import { getSafTreeName } from './utils/safUri';

export interface PickedFolder {
  uri: string;
  name: string;
}

/**
 * Opens the native OS folder picker and returns the selected folder URI and name.
 * Returns null if the user cancels the picker.
 */
const pickFolder = async (): Promise<PickedFolder | null> => {
  try {
    const result = await pickDirectory({ requestLongTermAccess: false });
    const uri = result.uri;

    const name = getSafTreeName(uri, strings.generic.unnamedFolder);

    logger.info(`[folderUpload] Folder picked — uri: ${uri}, name: ${name}`);

    return { uri, name };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw err;
  }
};

export const folderUploadService = {
  pickFolder,
};
