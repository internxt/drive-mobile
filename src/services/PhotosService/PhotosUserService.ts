import { photos } from '@internxt/sdk';
import Axios from 'axios';

import { PhotosServiceModel } from '../../types/photos';
import PhotosDeviceService from './PhotosDeviceService';
import PhotosLogService from './PhotosLogService';

export default class PhotosUserService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;
  private readonly deviceService: PhotosDeviceService;
  private readonly logService: PhotosLogService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: photos.Photos,
    deviceService: PhotosDeviceService,
    logService: PhotosLogService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.deviceService = deviceService;
    this.logService = logService;
  }

  /**
   * @description Stop using the replace endpoint when all the devices were fixed
   */
  public async initialize(): Promise<photos.User> {
    const uniqueId = this.deviceService.getUniqueId();
    const mac = await this.deviceService.getMacAddress();
    const name = await this.deviceService.getDeviceName();

    // * FIX: Mac address to unique ID
    await Axios.post(
      `${this.photosSdk.baseUrl}/devices/fix-mac-address`,
      { uniqueId, mac },
      {
        headers: {
          Authorization: `Bearer ${this.photosSdk.accessToken}`,
        },
      },
    );

    const user = await this.photosSdk.users.initialize({
      mac: uniqueId,
      name,
      bridgeUser: this.model.networkCredentials.user,
      bridgePassword: this.model.networkCredentials.password,
    });

    this.model.user = user;

    this.logService.info('User initialized');

    return user;
  }
}
