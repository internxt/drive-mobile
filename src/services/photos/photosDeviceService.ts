import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { HTTP_CONFLICT, HTTP_NOT_FOUND } from 'src/services/common/httpStatusCodes';
import { SdkManager } from 'src/services/common/sdk/SdkManager';
import { PhotoDevice } from '@internxt/sdk/dist/drive/photos';
import { PhotoDeviceNameConflictError } from './errors';

class PhotosDeviceService {
  constructor(private readonly sdk: SdkManager) {}

  listDevices(): Promise<PhotoDevice[]> {
    return this.sdk.photos.listDevices();
  }

  async createDevice(deviceName: string): Promise<PhotoDevice> {
    try {
      return await this.sdk.photos.createDevice(deviceName);
    } catch (err) {
      if (err instanceof AxiosResponseError && err.status === HTTP_CONFLICT) {
        throw new PhotoDeviceNameConflictError(deviceName);
      }
      throw err;
    }
  }

  async getDevice(uuid: string): Promise<PhotoDevice | null> {
    try {
      return await this.sdk.photos.getDevice(uuid);
    } catch (err) {
      if (err instanceof AxiosResponseError && err.status === HTTP_NOT_FOUND) {
        return null;
      }
      throw err;
    }
  }

  deleteDevice(uuid: string): Promise<void> {
    return this.sdk.photos.deleteDevice(uuid);
  }

  renameDevice(uuid: string, deviceName: string): Promise<PhotoDevice> {
    return this.sdk.photos.renameDevice(uuid, deviceName);
  }
}

export const photosDeviceService = new PhotosDeviceService(SdkManager.getInstance());
