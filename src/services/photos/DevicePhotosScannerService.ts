import { Platform } from 'react-native';
import { PHOTOS_PER_GROUP } from './constants';
import * as MediaLibrary from 'expo-media-library';
import { RunnableService } from '../../helpers/services';

export enum DevicePhotosScannerStatus {
  PAUSED = 'PAUSED',
  DONE = 'DONE',
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
}
export type OnGroupReadyCallback = (items: MediaLibrary.Asset[], checkpoint?: string) => void;
export type OnStatusChangeCallback = (status: DevicePhotosScannerStatus) => void;
export type OnTotalPhotosCalculatedCallback = (totalPhotos: number) => void;

export class DevicePhotosScannerService extends RunnableService<DevicePhotosScannerStatus> {
  private status = DevicePhotosScannerStatus.IDLE;
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

  private async getGroup() {
    if (this.status !== DevicePhotosScannerStatus.RUNNING) return;
    const photos = await MediaLibrary.getAssetsAsync({ first: PHOTOS_PER_GROUP, after: this.nextCursor });
    this.handleGroupReady(photos.assets);
    if (photos.hasNextPage && photos.endCursor && this.status === DevicePhotosScannerStatus.RUNNING) {
      this.nextCursor = photos.endCursor;
      this.getGroup();
    } else {
      this.updateStatus(DevicePhotosScannerStatus.DONE);
      this.updateStatus(DevicePhotosScannerStatus.IDLE);
    }

    return photos;
  }
  private handleGroupReady = async (items: MediaLibrary.Asset[], checkpoint?: string) => {
    for (const edge of items) {
      if (Platform.OS === 'ios') {
        edge.uri = this.convertLocalIdentifierToAssetLibrary(
          edge.uri.replace('ph://', ''),
          edge.mediaType === MediaLibrary.MediaType.photo ? 'jpg' : 'mov',
        );
      }
    }

    this.onGroupReadyCallback && this.onGroupReadyCallback(items, checkpoint);
  };

  private convertLocalIdentifierToAssetLibrary(localIdentifier: string, ext: string): string {
    const hash = localIdentifier.split('/')[0];

    return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
  }
}
