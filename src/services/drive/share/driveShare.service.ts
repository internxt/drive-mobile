import appService from '@internxt-mobile/services/AppService';
import AuthService from '@internxt-mobile/services/AuthService';
import { SdkManager } from '@internxt-mobile/services/common';
import { aes } from '@internxt/lib';
import { CreateSharingPayload } from '@internxt/sdk/dist/drive/share/types';
import Share from 'react-native-share';
class DriveShareService {
  constructor(private sdk: SdkManager) {}
  async getShareLinks(page = 0) {
    return this.sdk.share.getShareLinks(page, 50);
  }

  async generateShareLink(publicSharingPayload: CreateSharingPayload, mnemonic: string) {
    const publicSharinresultgItemData = await this.sdk.share.createSharing(publicSharingPayload);
    const { id: sharingId, encryptedCode } = publicSharinresultgItemData;

    return this.getUsableLink({
      type: publicSharingPayload.itemType,
      sharingId,
      code: encryptedCode,
      mnemonic,
    });
  }

  async getShareLinkFromCodeAndToken({ type, uuid, code }: { type: 'file' | 'folder'; uuid: string; code: string }) {
    const { credentials } = await AuthService.getAuthCredentials();
    if (!credentials?.user) throw new Error('User not found');
    return this.getUsableLink({
      type,
      mnemonic: credentials?.user.mnemonic,
      sharingId: uuid,
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
    sharingId,
    code,
    mnemonic,
  }: {
    type: string;
    sharingId: string;
    code: string;
    mnemonic: string;
  }) {
    return `${appService.constants.SHARE_LINKS_URL}/sh/${type}/${sharingId}/${aes.decrypt(code, mnemonic)}`;
  }
}

export const driveShareService = new DriveShareService(SdkManager.getInstance());
