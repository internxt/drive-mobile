/* eslint-disable @typescript-eslint/ban-ts-comment */
import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Axios from 'axios';
import { getHeaders } from 'src/helpers/headers';
import { constants } from './AppService';
import { SdkManager } from './common/sdk/SdkManager';
const FormData = global.FormData;

class UserService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public payment(token: string, stripePlan: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fetch(`${constants.DRIVE_API_URL}/buy`, {
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

  public updateProfile(payload: UpdateProfilePayload) {
    const token = SdkManager.getInstance().getApiSecurity().newToken;
    return this.sdk.usersV2.updateUserProfile(payload, token);
  }

  public async deleteUserAvatar() {
    const token = SdkManager.getInstance().getApiSecurity().newToken;
    await this.sdk.usersV2.deleteUserAvatar(token);
  }

  public async updateUserAvatar(payload: { name: string; uri: string }) {
    const url = `${constants.DRIVE_API_URL}/user/avatar`;
    const headers = await getHeaders();
    const headersMap: Record<string, string> = {};
    const formData = new FormData();

    //@ts-ignore
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
  public refreshUser(userUuid: string): Promise<{ user: UserSettings; oldToken: string; newToken: string }> {
    return this.sdk.usersV2.getUserData({ userUuid });
  }

  public sendVerificationEmail() {
    const token = SdkManager.getInstance().getApiSecurity().newToken;
    return this.sdk.usersV2.sendVerificationEmail(token);
  }
}

export default new UserService(SdkManager.getInstance());
