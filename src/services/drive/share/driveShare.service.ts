import appService from '@internxt-mobile/services/AppService';
import AuthService from '@internxt-mobile/services/AuthService';
import { SdkManager } from '@internxt-mobile/services/common';
import { aes } from '@internxt/lib';
import { GenerateShareLinkPayload } from '@internxt/sdk/dist/drive/share/types';
import Share from 'react-native-share';
class DriveShareService {
  constructor(private sdk: SdkManager) {}
  async getShareLinks(page = 0) {
    return this.sdk.share.getShareLinks(page, 50);
  }

  async generateShareLink(plainCode: string, mnemonic: string, payload: GenerateShareLinkPayload) {
    const result = await this.sdk.share.createShareLink(payload);

    return this.getUsableLink({
      type: payload.type,
      token: result.token,
      /** Seems like the SDK TS signatures are wrong */
      code: (result as unknown as { encryptedCode: string }).encryptedCode || plainCode,
      mnemonic,
    });
  }

  async updateShareLink({
    mnemonic,
    shareId,
    plainPassword,
  }: {
    shareId: string;
    plainPassword: string | null;
    mnemonic: string;
  }) {
    const shareLink = await this.sdk.share.updateShareLink({ itemId: shareId, plainPassword });

    return this.getUsableLink({
      type: shareLink.isFolder ? 'folder' : 'file',
      mnemonic,
      token: shareLink.token,
      code: shareLink.code,
    });
  }

  async getShareLinkFromCodeAndToken({ type, token, code }: { type: 'file' | 'folder'; token: string; code: string }) {
    const { credentials } = await AuthService.getAuthCredentials();
    if (!credentials?.user) throw new Error('User not found');
    return this.getUsableLink({
      type,
      mnemonic: credentials?.user.mnemonic,
      token,
      code,
    });
  }

  shareGeneratedSharedLink(link: string) {
    return Share.open({
      message: link,
    });
  }

  deleteShareLink({ shareId }: { shareId: string }) {
    return this.sdk.share.deleteShareLink(shareId);
  }

  private getUsableLink({
    type,
    token,
    code,
    mnemonic,
  }: {
    type: string;
    token: string;
    code: string;
    mnemonic: string;
  }) {
    return `${appService.constants.WEB_CLIENT_URL}/sh/${type}/${token}/${aes.decrypt(code, mnemonic)}`;
  }
}

export const driveShareService = new DriveShareService(SdkManager.getInstance());
