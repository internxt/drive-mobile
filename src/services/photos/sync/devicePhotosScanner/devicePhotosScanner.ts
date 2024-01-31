import { PHOTOS_PER_GROUP } from '../../constants';
import * as MediaLibrary from 'expo-media-library';
import { RunnableService } from '../../../../helpers/services';
import { DevicePhoto, PhotosItem } from '@internxt-mobile/types/photos';
import { photosUtils } from '../../utils';

export enum DevicePhotosScannerStatus {
  PAUSED = 'PAUSED',
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  COMPLETED = 'COMPLETED',
  NO_PHOTOS_IN_DEVICE = 'NO_PHOTOS_IN_DEVICE',
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
  private cachedDevicePhotos: { [assetKey: string]: DevicePhoto } = {};
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

  public getPhotoInDevice(name: string, takenAt: number) {
    return this.cachedDevicePhotos[this.getAssetCacheKey(name, takenAt)];
  }

  /**
   * Starts or resume the device photos scanning
   */
  public run() {
    this.updateStatus(DevicePhotosScannerStatus.RUNNING);
    this.getGroup().then((photos) => {
      if (photos) {
        this.onTotalPhotosCalculatedCallback(photos.totalCount);
      } else {
        this.updateStatus(DevicePhotosScannerStatus.NO_PHOTOS_IN_DEVICE);
      }
    });
  }

  /**
   * Pauses the device photos scanning
   */
  public pause() {
    this.updateStatus(DevicePhotosScannerStatus.PAUSED);
  }

  public get hasFinished() {
    return (
      this.status === DevicePhotosScannerStatus.COMPLETED ||
      this.status === DevicePhotosScannerStatus.NO_PHOTOS_IN_DEVICE
    );
  }

  public destroy() {
    this.pause();
    this.updateStatus(DevicePhotosScannerStatus.IDLE);
    this.cachedDevicePhotos = {};
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
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video, MediaLibrary.MediaType.unknown],
      sortBy: MediaLibrary.SortBy.creationTime,
    });

    this.saveCachedDevicePhotos(result.assets);

    return {
      ...result,
      assets: result.assets.map((item) => photosUtils.getPhotosItem(item)),
    };
  }

  private getAssetCacheKeyFromAsset(asset: MediaLibrary.Asset) {
    let name = asset.filename;

    if (asset.filename.includes('.')) {
      name = asset.filename.split('.')[0];
    }

    return this.getAssetCacheKey(name, asset.creationTime);
  }

  private getAssetCacheKey(name: string, takenAt: number) {
    return `${name}-${takenAt.toString()}`;
  }
  private saveCachedDevicePhotos(assets: MediaLibrary.Asset[]) {
    assets.forEach((asset) => {
      this.cachedDevicePhotos[this.getAssetCacheKeyFromAsset(asset)] = asset;
    });
  }

  private async getGroup(cursor?: string) {
    if (this.status !== DevicePhotosScannerStatus.RUNNING) return;

    const photos = await this.getDevicePhotosItems(cursor);

    this.handleGroupReady(photos.assets);
    if (photos.hasNextPage && photos.endCursor && this.status === DevicePhotosScannerStatus.RUNNING) {
      this.getGroup(photos.endCursor);
    } else {
      this.updateStatus(DevicePhotosScannerStatus.COMPLETED);
    }

    return photos;
  }
  private handleGroupReady = async (items: PhotosItem[]) => {
    this.onGroupReadyCallback && this.onGroupReadyCallback(items);
  };
}

export const devicePhotosScanner = new DevicePhotosScannerService();
