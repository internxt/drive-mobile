import { Device, User } from '@internxt/sdk/dist/photos';
import Axios from 'axios';
import { getUniqueId, getDeviceName, getMacAddress } from 'react-native-device-info';
import { SdkManager } from '@internxt-mobile/services/common';

import { PhotosCommonServices } from './PhotosCommonService';

class PhotosUserService {
  private device: Device | null = null;
  private user: User | null = null;
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }
  public getDevice() {
    return this.device;
  }

  public getUser() {
    return this.user;
  }
  /**
   * @description Stop using the replace endpoint when all the devices were fixed
   */
  public async init(): Promise<{
    user: User;
    device: Device;
  }> {
    const uniqueId = getUniqueId();
    const mac = await getMacAddress();
    const name = await getDeviceName();

    // * FIX: Mac address to unique ID
    await Axios.post(
      `${this.sdk.photos.baseUrl}/devices/fix-mac-address`,
      { uniqueId, mac },
      {
        headers: {
          Authorization: `Bearer ${this.sdk.getApiSecurity().photosToken}`,
        },
      },
    );

    const user = await this.sdk.photos.users.initialize({
      mac: uniqueId,
      name,
      bridgeUser: PhotosCommonServices.model.networkCredentials.user,
      bridgePassword: PhotosCommonServices.model.networkCredentials.password,
    });
    this.device = await this.sdk.photos.devices.createDevice({ mac, name, userId: user.id });
    this.user = user;
    PhotosCommonServices.log.info('User and device initialized');

    return {
      user: this.user,
      device: this.device,
    };
  }
}

export default new PhotosUserService(SdkManager.getInstance());
