import { Device, User } from '@internxt/sdk/dist/photos';
import Axios from 'axios';
import { getUniqueId, getDeviceName, getMacAddress } from 'react-native-device-info';

import { PhotosCommonServices } from './PhotosCommonService';

export default class PhotosUserService {
  private device: Device | null = null;
  private user: User | null = null;
  public getDevice() {
    return this.device;
  }

  public getUser() {
    return this.user;
  }
  /**
   * @description Stop using the replace endpoint when all the devices were fixed
   */
  public async initialize(): Promise<{
    user: User;
    device: Device;
  }> {
    const uniqueId = getUniqueId();
    const mac = await getMacAddress();
    const name = await getDeviceName();

    // * FIX: Mac address to unique ID
    await Axios.post(
      `${PhotosCommonServices.sdk.baseUrl}/devices/fix-mac-address`,
      { uniqueId, mac },
      {
        headers: {
          Authorization: `Bearer ${PhotosCommonServices.getAccessToken()}`,
        },
      },
    );

    const user = await PhotosCommonServices.sdk.users.initialize({
      mac: uniqueId,
      name,
      bridgeUser: PhotosCommonServices.model.networkCredentials.user,
      bridgePassword: PhotosCommonServices.model.networkCredentials.password,
    });
    this.device = await PhotosCommonServices.sdk.devices.createDevice({ mac, name, userId: user.id });
    this.user = user;
    PhotosCommonServices.log.info('User and device initialized');

    return {
      user: this.user,
      device: this.device,
    };
  }
}
