/* eslint-disable @typescript-eslint/ban-ts-comment */
import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Axios from 'axios';
import { decryptText, decryptTextWithKey, encryptText, passToHash } from 'src/helpers';
import { getHeaders } from 'src/helpers/headers';
import { constants } from './common/app/AppService';
import { SdkManager } from './common/sdk/SdkManager';
const FormData = global.FormData;

class UserService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public signin(
    email: string,
    password: string,
    sKey: string,
    twoFactorCode: string,
  ): Promise<{ user: any; userTeam: any | null; token: string; photosToken: string }> {
    return new Promise((resolve, reject) => {
      const salt = decryptText(sKey);
      const hashObj = passToHash({ password, salt });
      const encPass = encryptText(hashObj.hash);

      fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/access`, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          email,
          password: encPass,
          tfa: twoFactorCode,
        }),
      })
        .then(async (response) => {
          const body = await response.json();

          if (response.status === 200) {
            const user = body.user;

            user.email = email;
            user.mnemonic = user.mnemonic ? decryptTextWithKey(user.mnemonic, password) : null;

            if (!user.root_folder_id) {
              const initializeUserResponse = await this.initializeUser(email, user.mnemonic, body.token);

              user.root_folder_id = initializeUserResponse.user.root_folder_id;
              user.bucket = initializeUserResponse.user.bucket;
            }

            resolve({ token: body.token, photosToken: body.newToken, user, userTeam: body.userTeam });
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
    return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/initialize`, {
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

  public payment(token: string, stripePlan: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/buy`, {
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

  public async inviteAFriend(email: string): Promise<void> {
    return this.sdk.users.sendInvitation(email);
  }

  public updateProfile(payload: UpdateProfilePayload) {
    return this.sdk.users.updateProfile(payload);
  }

  public async deleteUserAvatar() {
    await this.sdk.users.deleteAvatar();
  }

  public async updateUserAvatar(payload: { name: string; uri: string }) {
    const url = `${constants.REACT_NATIVE_DRIVE_API_URL}/api/user/avatar`;
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};
    const formData = new FormData();

    formData.append('avatar', {
      //@ts-ignore
      uri: payload.uri,
      type: 'image/jpg',
      name: payload.name,
    });
    headers.forEach((value: string, key: string) => {
      headersMap[key] = value;
    });
    headersMap['content-type'] = 'multipart/form-data';

    const response = await Axios.put<{ avatar: string }>(url, formData, { headers: headersMap });

    return response.data;
  }

  /**
   * ! This endpoint accepts a body but is using GET method
   */
  public refreshUser(): Promise<{ user: UserSettings; token: string }> {
    return this.sdk.users.refreshUser();
  }

  public sendVerificationEmail() {
    return this.sdk.users.sendVerificationEmail();
  }
}

export default new UserService(SdkManager.getInstance());
