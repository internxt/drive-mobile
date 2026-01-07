import appService from '@internxt-mobile/services/AppService';
import AuthService from '@internxt-mobile/services/AuthService';
import { SdkManager } from '@internxt-mobile/services/common';
import { CreateSharingPayload, ListAllSharedFoldersResponse } from '@internxt-mobile/types/drive/shared';
import { aes } from '@internxt/lib';
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

  stopSharingItem({ itemUUID, itemType }: { itemUUID: string; itemType: 'folder' | 'file' }) {
    return this.sdk.share.stopSharingFolder(itemType, itemUUID);
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

  async getSharedFolders({
    page,
    perPage,
    orderBy,
  }: {
    page: number;
    perPage: number;
    orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC';
  }): Promise<ListAllSharedFoldersResponse> {
    return this.sdk.share.getAllSharedFolders(page, perPage, orderBy);
  }

  async getSharedFiles({
    page,
    perPage,
    orderBy,
  }: {
    page: number;
    perPage: number;
    orderBy?: 'views:ASC' | 'views:DESC' | 'createdAt:ASC' | 'createdAt:DESC';
  }): Promise<ListAllSharedFoldersResponse> {
    return this.sdk.share.getAllSharedFiles(page, perPage, orderBy);
  }
}

export const driveShareService = new DriveShareService(SdkManager.getInstance());
