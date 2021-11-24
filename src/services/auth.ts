import { encryptText, encryptTextWithKey, passToHash } from '../helpers';
import analytics, { getAnalyticsData } from './analytics';
import { getHeaders } from '../helpers/headers';
import { isJsonString } from '../screens/SignUpScreen/registerUtils';
import { DevicePlatform } from '../types';
import { deviceStorage } from './deviceStorage';

interface LoginResponse {
  tfa: string;
  sKey: string;
}

class AuthService {
  public async apiLogin(email: string): Promise<LoginResponse> {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/login`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ email: email }),
    }).then(async (res) => {
      const data = await res.text();
      const json = isJsonString(data);

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
    try {
      const userData = await getAnalyticsData();

      analytics
        .track('user-signout', { userId: userData.uuid, email: userData.email, platform: DevicePlatform.Mobile })
        .catch(() => undefined);
      // Delete login data
      deviceStorage.clearStorage();
    } catch (err) {
      console.error('Error during signout: ', err);
    }
  }

  public async doRecoverPassword(newPassword: string): Promise<Response> {
    const xUser = await deviceStorage.getUser();

    const mnemonic = xUser.mnemonic;
    const hashPass = passToHash({ password: newPassword });

    const encryptedPassword = encryptText(hashPass.hash);
    const encryptedSalt = encryptText(hashPass.salt);
    const encryptedMnemonic = encryptTextWithKey(mnemonic, newPassword);

    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/user/recover`, {
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

  public sendDeactivationsEmail(email: string): Promise<any> {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/reset/${email}`, {}).then(async (res) => {
      if (res.status !== 200) {
        throw Error();
      }
    });
  }
}

export default new AuthService();
