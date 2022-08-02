import Axios from 'axios';
import AesUtils from '../../helpers/aesUtils';
import { getHeaders } from '../../helpers/headers';
import { NotificationType } from '../../types';
import { constants } from '../AppService';
import errorService from '../ErrorService';
import notificationsService from '../NotificationsService';

class DriveShareService {
  public async getShareList(): Promise<any[]> {
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};

    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });

    const response = await Axios.get(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/share/list`, {
      headers: headersMap,
    });

    return this.decryptFileNames(response.data);
  }

  private async decryptFileNames(shares: any[]) {
    shares.map((share) => {
      try {
        const decryptedName = AesUtils.decrypt(
          share.fileInfo.name,
          constants.REACT_NATIVE_CRYPTO_SECRET2 + '-' + share.fileInfo.folderId,
        );

        share.fileInfo.name = decryptedName;
      } catch (err) {
        const castedError = errorService.castError(err);
        notificationsService.show({
          text1: 'Error decrypting files: ' + castedError.message,
          type: NotificationType.Error,
        });
      }
    });

    return shares;
  }
}

export default DriveShareService;
