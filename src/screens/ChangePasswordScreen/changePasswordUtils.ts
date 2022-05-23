import { decryptText, encryptText, encryptTextWithKey, passToHash } from '../../helpers';
import { getHeaders } from '../../helpers/headers';
import AesUtils from '../../helpers/aesUtils';
import { constants } from '../../services/AppService';
import { asyncStorage } from '../../services/AsyncStorageService';
import notificationsService from '../../services/NotificationsService';
import { NotificationType } from '../../types';
import errorService from '../../services/ErrorService';
interface ChangePasswordParam {
  password: string;
  newPassword: string;
}

async function getSalt(email: string) {
  const response = await fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/login`, {
    method: 'post',
    headers: await getHeaders(),
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  const salt = decryptText(data.sKey);

  return salt;
}

export async function doChangePassword(params: ChangePasswordParam): Promise<any> {
  const xUser = await asyncStorage.getUser();
  const salt = await getSalt(xUser.email);

  if (!salt) {
    throw new Error('Internal server error. Please try later.');
  }
  const hashedCurrentPassword = passToHash({ password: params.password, salt }).hash;
  const encCurrentPass = encryptText(hashedCurrentPassword);

  const hashedNewPassword = passToHash({ password: params.newPassword });
  const encNewPass = encryptText(hashedNewPassword.hash);
  const encryptedNewSalt = encryptText(hashedNewPassword.salt);

  const encryptedMnemonic = encryptTextWithKey(xUser.mnemonic, params.newPassword);

  let privateKeyEncrypted;

  try {
    const privateKey = Buffer.from(xUser.privateKey, 'base64').toString();

    privateKeyEncrypted = AesUtils.encrypt(privateKey, params.newPassword);
  } catch (err) {
    const castedError = errorService.castError(err);
    notificationsService.show({
      text1: 'Error encrypting private key: ' + castedError.message,
      type: NotificationType.Error,
    });
  }

  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/user/password`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify({
      currentPassword: encCurrentPass,
      newPassword: encNewPass,
      newSalt: encryptedNewSalt,
      mnemonic: encryptedMnemonic,
      privateKey: privateKeyEncrypted,
    }),
  }).then(async (res) => {
    if (res.status === 200) {
      return res.json();
    } else {
      const body = await res.text();
      const json = JSON.parse(body);

      if (json) {
        throw Error(json.error);
      } else {
        throw Error(body);
      }
    }
  });
}
