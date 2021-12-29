import { decryptText, decryptTextWithKey, encryptText, passToHash } from '../helpers';
import { deviceStorage } from './deviceStorage';
import { getHeaders } from '../helpers/headers';
import { REACT_NATIVE_DRIVE_API_URL } from '@env';

class UserService {
  public signin(email: string, password: string, sKey: string, twoFactorCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const salt = decryptText(sKey);
      const hashObj = passToHash({ password, salt });
      const encPass = encryptText(hashObj.hash);

      fetch(`${REACT_NATIVE_DRIVE_API_URL}/api/access`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          email,
          password: encPass,
          tfa: twoFactorCode,
        }),
      })
        .then(async (response) => {
          return { response, data: await response.json() };
        })
        .then(async (response) => {
          const body = response.data;

          if (response.response.status === 200) {
            // Manage successfull login
            const user = body.user;

            user.email = email;
            user.mnemonic = user.mnemonic ? decryptTextWithKey(user.mnemonic, password) : null;

            if (!user.root_folder_id) {
              const initializeUserResponse = await this.initializeUser(email, user.mnemonic, body.token);

              // eslint-disable-next-line camelcase
              user.root_folder_id = initializeUserResponse.user.root_folder_id;
              user.bucket = initializeUserResponse.user.bucket;
            }

            // Store login data
            await deviceStorage.saveItem('xToken', body.token);
            await deviceStorage.saveItem('xUser', JSON.stringify(user));

            resolve({ token: body.token, user });
          } else {
            throw body.error ? body.error : 'Unkown error';
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  public async initializeUser(email: string, mnemonic: string, token: string) {
    return fetch(`${REACT_NATIVE_DRIVE_API_URL}/api/initialize`, {
      method: 'POST',
      headers: await getHeaders(token, mnemonic),
      body: JSON.stringify({
        email: email,
        mnemonic: mnemonic,
      }),
    }).then((res) => {
      if (res.status !== 200) {
        throw Error(res.statusText);
      }
      return res.json();
    });
  }

  public payment(token: string, stripePlan: string): Promise<any> {
    return new Promise((resolve, reject) => {
      fetch(`${REACT_NATIVE_DRIVE_API_URL}/api/buy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: JSON.stringify(token),
          plan: stripePlan,
        }),
      })
        .then(async (response) => {
          const body = await response.json();

          resolve(body.message);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

const userService = new UserService();
export default userService;
