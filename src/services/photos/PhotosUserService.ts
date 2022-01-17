import { photos } from '@internxt/sdk';

import { PhotosServiceModel } from '../../types/photos';
import PhotosDeviceService from './PhotosDeviceService';

export default class PhotosUserService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;
  private readonly deviceService: PhotosDeviceService;

  constructor(model: PhotosServiceModel, photosSdk: photos.Photos, deviceService: PhotosDeviceService) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.deviceService = deviceService;
  }

  public async initialize(): Promise<photos.User> {
    const mac = await this.deviceService.getMacAddress();
    const name = await this.deviceService.getDeviceName();
    const user = await this.photosSdk.users.initialize({
      mac,
      name,
      bridgeUser: this.model.networkCredentials.user,
      bridgePassword: this.model.networkCredentials.password,
    });

    this.model.user = user;

    console.log('(PhotosService) User initialized');

    return user;
  }
}
