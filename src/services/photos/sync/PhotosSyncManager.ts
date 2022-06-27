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
    this.devicePhotosSyncChecker.run();
    this.devicePhotosScanner.run();
    this.updateStatus(PhotosSyncManagerStatus.RUNNING);
  }
  public pause(): void {
    this.devicePhotosSyncChecker.pause();
    this.devicePhotosScanner.pause();
    this.updateStatus(PhotosSyncManagerStatus.PAUSED);
  }

  public resume() {
    return undefined;
  }

  public updateStatus(status: PhotosSyncManagerStatus) {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public restart(): void {
    this.devicePhotosSyncChecker.restart();
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
      }
      /*  if (status === PhotosNetworkManagerStatus.EMPTY && !this.gettingRemotelyPhotos) {
        const nextGroup = this.groupsOfPhotosToNetworkCheck[0];
        console.log('status', nextGroup);
        if (nextGroup) {
          this.getAlreadyUploadedPhotos(nextGroup);
        }
      } */
    });
  }

  private onGroupOfPhotosReceived = (devicePhotos: DevicePhoto[]) => {
    this.addGroupOfPhotosToSync(devicePhotos);
  };

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

      if (
        this.groupsOfPhotosToNetworkCheck.length === this.config.checkIfExistsPhotosAmount &&
        !this.gettingRemotelyPhotos
      ) {
        this.getAlreadyUploadedPhotos();
      }
    }
  };

  private async getAlreadyUploadedPhotos() {
    this.gettingRemotelyPhotos = true;
    const devicePhotos = this.groupsOfPhotosToNetworkCheck.splice(0, this.config.checkIfExistsPhotosAmount);
    const photosToUpload = await this.photosNetworkManager.getMissingRemotely(devicePhotos);

    for (const photoToUpload of photosToUpload) {
      try {
        if (photoToUpload.exists && photoToUpload.photo) {
          console.log('To upload', photoToUpload.photo);
          await this.photosLocalDb.persistPhotoSync(
            photoToUpload.devicePhoto,
            photoToUpload.photoRef,
            photoToUpload.photo,
          );
          this.onDevicePhotoSyncCompletedCallback(null, photoToUpload.photo);
        }

        if (!photoToUpload.exists) {
          this.photosNetworkManager.addOperation({
            result: PhotosNetworkOperationResult.UNKNOWN,
            devicePhoto: photoToUpload.devicePhoto,
            hash: photoToUpload.hash,
            photoRef: photoToUpload.photoRef,
            onOperationCompleted: (err, photo) => {
              if (err) {
                this.onDevicePhotoSyncCompletedCallback(err, null);
              }
              if (photo) {
                this.photosLocalDb
                  .persistPhotoSync(photoToUpload.devicePhoto, photoToUpload.photoRef, photo)
                  .then(() => {
                    this.onDevicePhotoSyncCompletedCallback(null, photo);
                  })
                  .catch((err) => {
                    this.onDevicePhotoSyncCompletedCallback(err, null);
                  });
              }
            },
          });
        }
      } catch (e) {
        /*  this.devicePhotosSyncChecker.addOperation({
          id: `failed-upload-${photoToUpload.devicePhoto.id}`,
          devicePhoto: photoToUpload.devicePhoto,
        }); */
        console.error('Error uploading photo', e);
      }

      this.gettingRemotelyPhotos = false;
    }
  }

  private addGroupOfPhotosToSync(devicePhotos: DevicePhoto[]) {
    devicePhotos.forEach((devicePhoto) =>
      this.devicePhotosSyncChecker.addOperation({
        id: devicePhoto.id,
        devicePhoto,
        priority: DevicePhotosOperationPriority.NORMAL,
        onOperationCompleted: (err, resolvedOperation) => {
          if (err) {
            console.log('Error checking photo sync stage', err);
          }

          if (resolvedOperation) {
            this.onDevicePhotoSyncCheckResolved(resolvedOperation);
          }
        },
      }),
    );
  }
}
