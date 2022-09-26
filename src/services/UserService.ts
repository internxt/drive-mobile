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

  public async initializeUser(email: string, mnemonic: string) {
    return this.sdk.users.initialize(email, mnemonic);
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
    const url = `${constants.DRIVE_API_URL}/user/avatar`;
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
