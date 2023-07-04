import { Device, User } from '@internxt/sdk/dist/photos';
import Axios from 'axios';
import { getUniqueId, getDeviceName, getMacAddress } from 'react-native-device-info';
import { SdkManager } from '@internxt-mobile/services/common';
import AuthService from '@internxt-mobile/services/AuthService';
import { photosLogger, PhotosLogger } from '../logger';

class PhotosUserService {
  private device: Device | null = null;
  private user: User | null = null;

  constructor(private sdk: SdkManager, private logger: PhotosLogger) {}
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
    const { credentials } = await AuthService.getAuthCredentials();

    if (!credentials) {
      throw new Error('Credentials not found');
    }
    const uniqueId = getUniqueId();
    const mac = await getMacAddress();
    const name = await getDeviceName();

    // * FIX: Mac address to unique ID
    await Axios.post(
      `${this.sdk.photos.baseUrl}/devices/fix-mac-address`,
      { uniqueId, mac },
      {
        headers: {
          Authorization: `Bearer ${this.sdk.getApiSecurity().newToken}`,
        },
      },
    );

    const user = await this.sdk.photos.users.initialize({
      mac: uniqueId,
      name,
      bridgeUser: credentials.user.bridgeUser,
      bridgePassword: credentials.user.userId,
    });
    this.device = await this.sdk.photos.devices.createDevice({ mac, name, userId: user.id });
    this.user = user;
    this.logger.info('Photos user initialized');

    return {
      user: this.user,
      device: this.device,
    };
  }
}

export const photosUser = new PhotosUserService(SdkManager.getInstance(), photosLogger);
