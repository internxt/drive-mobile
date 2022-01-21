import { photos } from '@internxt/sdk';

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

    this.logService.info('(PhotosService) User initialized');

    return user;
  }
}
