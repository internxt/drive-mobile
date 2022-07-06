import { RunnableService } from '../../../helpers/services';
import {
  DevicePhoto,
  DevicePhotosOperationPriority,
  DevicePhotoSyncCheckOperation,
  PhotosNetworkManagerStatus,
  PhotosNetworkOperationResult,
  PhotosSyncManagerStatus,
  SyncStage,
} from '../../../types/photos';
import PhotosLocalDatabaseService from '../PhotosLocalDatabaseService';
import { PhotosNetworkManager } from '../network/PhotosNetworkManager';
import { DevicePhotosScannerService } from './DevicePhotosScannerService';
import { DevicePhotosSyncCheckerService } from './DevicePhotosSyncChecker';
import { Photo } from '@internxt/sdk/dist/photos';
import sentryService from '../../SentryService';

export type OnDevicePhotoSyncCompletedCallback = (error: Error | null, photo: Photo | null) => void;
export type OnStatusChangeCallback = (status: PhotosSyncManagerStatus) => void;
export type OnTotalPhotosCalculatedCallback = (totalPhotos: number) => void;

export type PhotosSyncManagerConfig = {
  checkIfExistsPhotosAmount: number;
};
export class PhotosSyncManager implements RunnableService<PhotosSyncManagerStatus> {
  public totalPhotosInDevice: number | null = null;
  public status: PhotosSyncManagerStatus = PhotosSyncManagerStatus.IDLE;
  private devicePhotosScanner: DevicePhotosScannerService;
  private devicePhotosSyncChecker: DevicePhotosSyncCheckerService;
  private photosNetworkManager: PhotosNetworkManager;
  private photosLocalDb: PhotosLocalDatabaseService;
  private groupsOfPhotosToNetworkCheck: DevicePhoto[] = [];
  private gettingRemotelyPhotos = false;
  private config: PhotosSyncManagerConfig;
  private onDevicePhotoSyncCompletedCallback: OnDevicePhotoSyncCompletedCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;
  private onTotalPhotosInDeviceCalculatedCallback: OnTotalPhotosCalculatedCallback = () => undefined;

  constructor(
    config: PhotosSyncManagerConfig,
    db: PhotosLocalDatabaseService,
    photosNetworkManager: PhotosNetworkManager,
  ) {
    this.config = config;
    this.devicePhotosScanner = new DevicePhotosScannerService();
    this.photosLocalDb = db;
    this.devicePhotosSyncChecker = new DevicePhotosSyncCheckerService(this.photosLocalDb);
    this.photosNetworkManager = photosNetworkManager;
    this.setupCallbacks();
  }

  public run(): void {
    this.devicePhotosScanner.run();

    this.updateStatus(PhotosSyncManagerStatus.RUNNING);
  }
  public pause(): void {
    this.devicePhotosSyncChecker.pause();
    this.devicePhotosScanner.pause();
    this.photosNetworkManager.pause();
    this.updateStatus(PhotosSyncManagerStatus.PAUSED);
  }

  public resume() {
    this.photosNetworkManager.resume();
  }

  public updateStatus(status: PhotosSyncManagerStatus) {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public restart(): void {
    this.devicePhotosScanner.restart();
  }

  public destroy(): void {
    this.devicePhotosSyncChecker.destroy();
    this.devicePhotosScanner.destroy();
  }
  public onPhotoSyncCompleted(callback: OnDevicePhotoSyncCompletedCallback) {
    this.onDevicePhotoSyncCompletedCallback = callback;
  }

  public onStatusChange(callback: OnStatusChangeCallback) {
    this.onStatusChangeCallback = callback;
  }

  public onTotalPhotosInDeviceCalculated(callback: OnTotalPhotosCalculatedCallback) {
    this.onTotalPhotosInDeviceCalculatedCallback = callback;
  }

  private setupCallbacks() {
    // Device photos scanner
    this.devicePhotosScanner.onGroupOfPhotosReady(this.onGroupOfPhotosReceived);
    this.devicePhotosScanner.onTotalPhotosCalculated((total) => {
      this.totalPhotosInDevice = total;
      this.onTotalPhotosInDeviceCalculatedCallback(total);
    });

    // Network manager
    this.photosNetworkManager.onStatusChange((status) => {
      if (status === PhotosNetworkManagerStatus.EMPTY) {
        this.updateStatus(PhotosSyncManagerStatus.EMPTY);
        if (this.shouldCheckPhotosRemotely()) {
          this.checkPhotosRemotely();
        }
      }

      if (status === PhotosNetworkManagerStatus.RUNNING) {
        this.updateStatus(PhotosSyncManagerStatus.RUNNING);
      }
    });
  }

  /**
   * Called every time we receive a group of photos from the DevicePhotosScanner
   *
   * @param devicePhotos A list of photos retrieved from the device that needs to be checked
   */
  private onGroupOfPhotosReceived = (devicePhotos: DevicePhoto[]) => {
    this.addGroupOfPhotosToSyncChecker(devicePhotos);
  };

  private shouldCheckPhotosRemotely() {
    return (
      this.groupsOfPhotosToNetworkCheck.length >= this.config.checkIfExistsPhotosAmount && !this.gettingRemotelyPhotos
    );
  }

  /**
   * Called when a operation sync check is finished via the DevicePhotosSyncChecker,
   * each operation contains a syncStage with the current stage of the photo
   *
   * if the operation sync stage is NEEDS_REMOTE_CHECK photo is added to a group
   * so it can be checked remotely agains the server
   *
   * NEEDS_REMOTE_CHECK -> Means we need to ask the server if the photo exists
   * IN_SYNC -> Means the photo was found in a sync stage locally
   *
   *
   * @param operation The operation with the result
   * @returns
   */
  private onDevicePhotoSyncCheckResolved = async (operation: DevicePhotoSyncCheckOperation) => {
    // The sync checker found that the photo is already in sync,
    // we just notify via callback

    if (operation.syncStage === SyncStage.IN_SYNC) {
      return this.onDevicePhotoSyncCompletedCallback(null, operation.uploadedPhoto || null);
    }

    // Photo was not in sync, to make sure, first we will
    // ask the server if a group of photos exists

    if (operation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
      this.groupsOfPhotosToNetworkCheck.push(operation.devicePhoto);
      if (this.shouldCheckPhotosRemotely()) {
        await this.checkPhotosRemotely();
      }
    }
  };

  private async checkPhotosRemotely() {
    this.gettingRemotelyPhotos = true;
    const devicePhotos = this.groupsOfPhotosToNetworkCheck.splice(0, this.config.checkIfExistsPhotosAmount);
    const photosToUpload = await this.photosNetworkManager.getMissingRemotely(devicePhotos);

    if (!devicePhotos.length) return null;
    for (const photoToUpload of photosToUpload) {
      try {
        if (photoToUpload.exists && photoToUpload.photo) {
          await this.photosLocalDb.persistPhotoSync(photoToUpload.photo, photoToUpload.devicePhoto);
          this.onDevicePhotoSyncCompletedCallback(null, photoToUpload.photo);
        }

        if (!photoToUpload.exists) {
          this.photosNetworkManager.addOperation({
            result: PhotosNetworkOperationResult.UNKNOWN,
            devicePhoto: photoToUpload.devicePhoto,
            hash: photoToUpload.hash,
            photoRef: photoToUpload.photoRef,
            onOperationCompleted: async (err, photo) => {
              if (err) {
                this.onDevicePhotoSyncCompletedCallback(err, null);
              }
              if (photo) {
                this.persistPhotoInSync(photo);
              }
            },
          });
        }
      } catch (e) {
        /**
         * Send the error to Sentry, not much we can do here
         */
        sentryService.native.captureException(e as Error);
      }
    }

    this.gettingRemotelyPhotos = false;
  }

  private async persistPhotoInSync(photo: Photo) {
    try {
      await this.photosLocalDb.persistPhotoSync(photo);
      this.onDevicePhotoSyncCompletedCallback(null, photo);
    } catch (err) {
      this.onDevicePhotoSyncCompletedCallback(err as Error, null);
    }
  }

  private addGroupOfPhotosToSyncChecker(devicePhotos: DevicePhoto[]) {
    devicePhotos.forEach((devicePhoto) =>
      this.devicePhotosSyncChecker.addOperation({
        id: devicePhoto.id,
        devicePhoto,
        priority: DevicePhotosOperationPriority.NORMAL,
        onOperationCompleted: async (_, resolvedOperation) => {
          if (resolvedOperation) {
            await this.onDevicePhotoSyncCheckResolved(resolvedOperation);
          }
        },
      }),
    );
  }
}
