import { photos } from '@internxt/sdk';
import { getMacAddress, getDeviceName } from 'react-native-device-info';

import { PhotosServiceModel } from '../../types/photos';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosLogService from './PhotosLogService';

export default class PhotosDeviceService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly logService: PhotosLogService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: photos.Photos,
    localDatabaseService: PhotosLocalDatabaseService,
    logService: PhotosLogService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.localDatabaseService = localDatabaseService;
    this.logService = logService;
  }

  public async initialize(): Promise<photos.Device> {
    if (!this.model.user) {
      throw new Error('(PhotosDeviceService.initialize) user not found');
    }

    const mac = await this.getMacAddress();
    const name = await this.getDeviceName();
    const device = await this.photosSdk.devices.createDevice({ mac, name, userId: this.model.user.id });

    this.model.device = device;

    await this.localDatabaseService.setNewestDate(device.newestDate);
    device.oldestDate ? await this.localDatabaseService.setOldestDate(device.oldestDate) : null;

    this.logService.info('(PhotosService) Device initialized');

    return device;
  }

  public getMacAddress(): Promise<string> {
    return getMacAddress();
  }

  public getDeviceName(): Promise<string> {
    return getDeviceName();
  }
}
