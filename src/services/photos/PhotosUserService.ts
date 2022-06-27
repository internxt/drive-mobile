import { photos } from '@internxt/sdk';
import Axios from 'axios';
import { getUniqueId, getDeviceName, getMacAddress } from 'react-native-device-info';

import { PhotosCommonServices } from './PhotosCommonService';

export default class PhotosUserService {
  /**
   * @description Stop using the replace endpoint when all the devices were fixed
   */
  public async initialize(): Promise<photos.User> {
    if (!PhotosCommonServices?.sdk) throw new Error('Photos sdk not initialized');
    if (!PhotosCommonServices?.model.networkCredentials) throw new Error('User network credentials not found');
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
    PhotosCommonServices.model.user = user;
    const device = await PhotosCommonServices.sdk.devices.createDevice({ mac, name, userId: user.id });
    PhotosCommonServices.model.device = device;

    PhotosCommonServices.log.info('User and device initialized');

    return user;
  }
}
