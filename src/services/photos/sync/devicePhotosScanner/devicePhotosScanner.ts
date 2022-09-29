import { PHOTOS_PER_GROUP } from '../../constants';
import * as MediaLibrary from 'expo-media-library';
import { RunnableService } from '../../../../helpers/services';
import { PhotosItem } from '@internxt-mobile/types/photos';
import { photosUtils } from '../../utils';

export enum DevicePhotosScannerStatus {
  PAUSED = 'PAUSED',
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
}
export type OnGroupReadyCallback = (items: PhotosItem[]) => void;
type OnStatusChangeCallback = (status: DevicePhotosScannerStatus) => void;
type OnTotalPhotosCalculatedCallback = (totalPhotos: number) => void;

/**
 * Scans the device camera roll looking for all the photos
 * the data is obtained in batches using an instance callback
 *
 * Use the status callback to get notified when the scan is finished
 */
export class DevicePhotosScannerService extends RunnableService<DevicePhotosScannerStatus> {
  public status = DevicePhotosScannerStatus.IDLE;
  private onGroupReadyCallback: OnGroupReadyCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;
  private onTotalPhotosCalculatedCallback: OnTotalPhotosCalculatedCallback = () => undefined;
  private nextCursor?: string;

  public static async getDevicePhotoData(photo: MediaLibrary.Asset) {
    return MediaLibrary.getAssetInfoAsync(photo);
  }
  public onGroupOfPhotosReady = (callback: OnGroupReadyCallback) => {
    this.onGroupReadyCallback = callback;
  };

  public onStatusChange = (callback: OnStatusChangeCallback) => {
    this.onStatusChangeCallback = callback;
  };

  public onTotalPhotosCalculated = (callback: OnTotalPhotosCalculatedCallback) => {
    this.onTotalPhotosCalculatedCallback = callback;
  };

  public resume() {
    this.run();
  }

  /**
   * Starts or resume the device photos scanning
   */
  public run() {
    this.updateStatus(DevicePhotosScannerStatus.RUNNING);
    this.getGroup().then((photos) => {
      if (photos) {
        this.onTotalPhotosCalculatedCallback(photos.totalCount);
      }
    });
  }

  /**
   * Pauses the device photos scanning
   */
  public pause() {
    this.updateStatus(DevicePhotosScannerStatus.PAUSED);
  }

  public isDone() {
    return this.status === DevicePhotosScannerStatus.COMPLETED;
  }

  public destroy() {
    this.pause();
    this.nextCursor = undefined;
    this.updateStatus(DevicePhotosScannerStatus.IDLE);
  }

  /**
   * Restarts the device photos scanning
   * pause + reset state + run again
   */
  public restart(): void {
    this.destroy();
    this.run();
  }

  public updateStatus(status: DevicePhotosScannerStatus) {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public async getDevicePhotosItems(nextCursor?: string, photosPerPage = PHOTOS_PER_GROUP) {
    const result = await MediaLibrary.getAssetsAsync({
      first: photosPerPage,
      after: nextCursor,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    return {
      ...result,
      assets: result.assets.map((item) => photosUtils.getPhotosItem(item)),
    };
  }

  private async getGroup() {
    if (this.status !== DevicePhotosScannerStatus.RUNNING) return;

    const photos = await this.getDevicePhotosItems(this.nextCursor);

    this.handleGroupReady(photos.assets);
    if (photos.hasNextPage && photos.endCursor && this.status === DevicePhotosScannerStatus.RUNNING) {
      this.nextCursor = photos.endCursor;
      this.getGroup();
    } else {
      this.updateStatus(DevicePhotosScannerStatus.COMPLETED);
    }

    return photos;
  }
  private handleGroupReady = async (items: PhotosItem[]) => {
    this.onGroupReadyCallback && this.onGroupReadyCallback(items);
  };
}
