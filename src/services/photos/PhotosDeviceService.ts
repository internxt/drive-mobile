import { photos } from '@internxt/sdk';
import { getMacAddress, getDeviceName } from 'react-native-device-info';

import { PhotosServiceModel } from '../../types/photos';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';

export default class PhotosDeviceService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;
  private readonly localDatabaseService: PhotosLocalDatabaseService;

  constructor(model: PhotosServiceModel, photosSdk: photos.Photos, localDatabaseService: PhotosLocalDatabaseService) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.localDatabaseService = localDatabaseService;
  }

  public async initialize(): Promise<photos.Device> {
    if (!this.model.user) {
      throw new Error('(PhotosDeviceService.initialize) user not found');
    }

    const mac = await this.getMacAddress();
    const name = await this.getDeviceName();
    const device = await this.photosSdk.devices.createDevice({ mac, name, userId: this.model.user.id });

    this.model.device = device;

    await this.localDatabaseService.setSyncUpdatedAt(device.synchronizedAt);

    console.log('(PhotosService) Device initialized');

    return device;
  }

  public getMacAddress() {
    return getMacAddress();
  }

  public getDeviceName() {
    return getDeviceName();
  }
}
