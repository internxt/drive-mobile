import { decryptText, encryptText, encryptTextWithKey, passToHash } from '../helpers';
import analytics, { AnalyticsEventKey } from './analytics';
import { getHeaders } from '../helpers/headers';
import { DevicePlatform, NotificationType } from '../types';
import { asyncStorage } from './asyncStorage';
import { constants } from './app';
import AesUtils from '../helpers/aesUtils';
import errorService from './error';
import notificationsService from './notifications';

interface LoginResponse {
  tfa: string;
  sKey: string;
}

interface ChangePasswordParam {
  password: string;
  newPassword: string;
}

class AuthService {
  public async apiLogin(email: string): Promise<LoginResponse> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/login`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ email: email }),
    }).then(async (res) => {
      const data = await res.text();
      const json = JSON.parse(data);

      if (res.status === 200) {
        return json;
      } else {
        if (json) {
          throw Error(json.error);
        } else {
          throw Error(data);
        }
      }
    });
  }

  public async signout(): Promise<void> {
    const userData = await asyncStorage.getUser();

    analytics.track(AnalyticsEventKey.UserSignOut, {
      userId: userData?.uuid,
      email: userData?.email,
      platform: DevicePlatform.Mobile,
    });

    await asyncStorage.clearStorage();
  }

  public async doRecoverPassword(newPassword: string): Promise<Response> {
    const xUser = await asyncStorage.getUser();
    const mnemonic = xUser.mnemonic;
    const hashPass = passToHash({ password: newPassword });
    const encryptedPassword = encryptText(hashPass.hash);
    const encryptedSalt = encryptText(hashPass.salt);
    const encryptedMnemonic = encryptTextWithKey(mnemonic, newPassword);

    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/user/recover`, {
      method: 'patch',
      headers: await getHeaders(),
      body: JSON.stringify({
        password: encryptedPassword,
        salt: encryptedSalt,
        mnemonic: encryptedMnemonic,
        privateKey: null,
      }),
    });
  }

  public async doChangePassword(params: ChangePasswordParam): Promise<any> {
    const xUser = await asyncStorage.getUser();
    const salt = await this.getSalt(xUser.email);

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

  public sendDeactivationsEmail(email: string): Promise<void> {
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/reset/${email}`, {}).then(async (res) => {
      if (res.status !== 200) {
        throw Error();
      }
    });
  }

  private async getSalt(email: string) {
    const response = await fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/login`, {
      method: 'post',
      headers: await getHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    const salt = decryptText(data.sKey);

    return salt;
  }
}

const authService = new AuthService();
export default authService;
