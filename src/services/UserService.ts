import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { SdkManager } from './common/sdk/SdkManager';

class UserService {
  private sdk: SdkManager;

  constructor(sdk: SdkManager) {
    this.sdk = sdk;
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
    const token = SdkManager.getInstance().getApiSecurity().newToken;
    const avatar = { uri: payload.uri, type: 'image/jpeg', name: payload.name } as unknown as Blob;

    return this.sdk.usersV2.updateUserAvatar({ avatar }, token);
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
