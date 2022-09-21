import appService from '@internxt-mobile/services/AppService';
import AuthService from '@internxt-mobile/services/AuthService';
import { SdkManager } from '@internxt-mobile/services/common';
import { aes } from '@internxt/lib';
import { GenerateShareLinkPayload } from '@internxt/sdk/dist/drive/share/types';
import Share from 'react-native-share';
class DriveShareService {
  constructor(private sdk: SdkManager) {}
  public async getShareLinks(page = 0) {
    return this.sdk.share.getShareLinks(page, 50);
  }

  public async generateShareLink(plainCode: string, mnemonic: string, payload: GenerateShareLinkPayload) {
    const result = await this.sdk.share.createShareLink(payload);

    return this.getUsableLink({
      created: result.created,
      type: payload.type,
      token: result.token,
      /** Seems like the SDK TS signatures are wrong */
      code: (result as unknown as { encryptedCode: string }).encryptedCode || plainCode,
      mnemonic,
    });
  }

  public async getShareLinkFromCodeAndToken({
    type,
    token,
    code,
  }: {
    type: 'file' | 'folder';
    token: string;
    code: string;
  }) {
    const { credentials } = await AuthService.getAuthCredentials();
    if (!credentials?.user) throw new Error('User not found');
    return this.getUsableLink({
      created: false,
      type,
      mnemonic: credentials?.user.mnemonic,
      token,
      code,
    });
  }

  public async shareGeneratedSharedLink(link: string) {
    return Share.open({
      message: link,
    });
  }

  public async deleteShareLink({ shareId }: { shareId: string }) {
    return this.sdk.share.deleteShareLink(shareId);
  }

  private getUsableLink({
    created,
    type,
    token,
    code,
    mnemonic,
  }: {
    created: boolean;
    type: string;
    token: string;
    code: string;
    mnemonic: string;
  }) {
    if (created) {
      return `${appService.constants.REACT_NATIVE_WEB_CLIENT_URL}/sh/${type}/${token}/${code}`;
    } else {
      return `${appService.constants.REACT_NATIVE_WEB_CLIENT_URL}/sh/${type}/${token}/${aes.decrypt(code, mnemonic)}`;
    }
  }
}

export const driveShareService = new DriveShareService(SdkManager.getInstance());
