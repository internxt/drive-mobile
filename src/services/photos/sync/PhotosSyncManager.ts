import { RunnableService } from '../../../helpers/services';
import {
  DevicePhoto,
  DevicePhotoRemoteCheck,
  DevicePhotosOperationPriority,
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  PhotosNetworkManagerStatus,
  PhotosNetworkOperationResult,
  PhotosSyncManagerStatus,
  SyncStage,
} from '../../../types/photos';
import PhotosLocalDatabaseService from '../PhotosLocalDatabaseService';
import { PhotosNetworkManager } from '../network/PhotosNetworkManager';
import { DevicePhotosScannerService, DevicePhotosScannerStatus } from './DevicePhotosScannerService';
import { DevicePhotosSyncCheckerService } from './DevicePhotosSyncChecker';
import { Photo } from '@internxt/sdk/dist/photos';
import sentryService from '../../SentryService';
import async from 'async';
import errorService from 'src/services/ErrorService';

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
  private groupsOfPhotosToRemoteCheck: DevicePhoto[][] = [];
  private config: PhotosSyncManagerConfig;
  private doingRemotePhotosCheck = false;
  public totalPhotosSynced = 0;

  private onDevicePhotoSyncCompletedCallback: OnDevicePhotoSyncCompletedCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;
  private onTotalPhotosInDeviceCalculatedCallback: OnTotalPhotosCalculatedCallback = () => undefined;
  private networkPhotosCheckQueue = async.queue<{ group: DevicePhoto[] }, null, Error>(async (task, next) => {
    try {
      const devicePhotosToUpload = await this.checkPhotosRemotely(task.group);
      // Upload the missing photos
      await this.uploadMissingDevicePhotos(devicePhotosToUpload);
      next(null);
    } catch (err) {
      next(err as Error, null);
    }
  }, 1);
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

  /**
   * Starts the PhotosSyncManager and set the status
   * to RUNNING, this method runs internally this services:
   *
   * - DevicePhotosScanner
   *
   */
  public run(): void {
    this.devicePhotosScanner.run();
    this.updateStatus(PhotosSyncManagerStatus.RUNNING);
  }

  /**
   * Pauses the PhotosSyncManager and set the status
   * to PAUSED. This method pauses internally this services:
   *
   * - PhotosNetworkManager
   *
   * If the PhotosSyncManager is paused, no more photos will be uploaded,
   * the DevicePhotosSyncChecker and the DevicePhotosScanner will keep
   * running in the background
   */
  public pause(): void {
    this.photosNetworkManager.pause();
    this.updateStatus(PhotosSyncManagerStatus.PAUSED);
  }

  /**
   * Resumes the PhotosSyncManager from a paused state and set the
   * status to RUNNING. This method resumes internally this services:
   *
   * - PhotosNetworkManager
   *
   */
  public resume() {
    this.photosNetworkManager.resume();
    this.updateStatus(PhotosSyncManagerStatus.RUNNING);
  }

  /**
   * Shutdown all the sync process, it emits status change
   * via callback
   */
  public destroy(): void {
    this.devicePhotosSyncChecker.destroy();
    this.devicePhotosScanner.destroy();
  }

  /**
   * Updates the PhotosSyncManager internal status, notifies
   * via callback the new status
   * @param status New status
   */
  public updateStatus(newStatus: PhotosSyncManagerStatus) {
    this.status = newStatus;
    this.onStatusChangeCallback(newStatus);
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
    // Transfer the groups of photos received from the DevicePhotosScannerService
    // to the DevicePhotosSyncCheckerService
    this.devicePhotosScanner.onGroupOfPhotosReady(this.onGroupOfPhotosReceived);

    // Gets the total amount of photos in the device available for sync
    this.devicePhotosScanner.onTotalPhotosCalculated((total) => {
      this.totalPhotosInDevice = total;
      this.onTotalPhotosInDeviceCalculatedCallback(total);
    });

    this.devicePhotosScanner.onStatusChange((status) => {
      switch (status) {
        case DevicePhotosScannerStatus.COMPLETED:
          break;
      }
      this.checkIfFinishSync();
    });

    // Listen for DevicePhotosSyncChecker status changes
    this.devicePhotosSyncChecker.onStatusChange((status) => {
      switch (status) {
        case DevicePhotosSyncCheckerStatus.COMPLETED:
          break;
      }
      this.checkIfFinishSync();
    });

    // Listen for PhotosNetworkManager status changes
    this.photosNetworkManager.onStatusChange((status) => {
      switch (status) {
        case PhotosNetworkManagerStatus.EMPTY:
          this.updateStatus(PhotosSyncManagerStatus.EMPTY);
          this.doingRemotePhotosCheck = false;
          break;

        case PhotosNetworkManagerStatus.RUNNING:
          this.updateStatus(PhotosSyncManagerStatus.RUNNING);
          break;
      }
      this.checkIfFinishSync();
    });

    this.networkPhotosCheckQueue.drain(() => {
      this.checkIfFinishSync();
    });
  }

  /**
   * Check if the PhotosSyncManager should finish the sync process
   * because all the managed services are done with their work.
   *
   * This updates the PhotosSyncManager status to COMPLETED if should finish
   */
  private checkIfFinishSync() {
    const shouldFinish = [
      this.photosNetworkManager.isDone(),
      this.devicePhotosSyncChecker.isDone(),
      this.devicePhotosScanner.isDone(),
      !this.doingRemotePhotosCheck,
      !this.groupsOfPhotosToRemoteCheck?.length,
    ].every((v) => v === true);

    if (
      !this.doingRemotePhotosCheck &&
      this.devicePhotosScanner.status === DevicePhotosScannerStatus.COMPLETED &&
      this.devicePhotosSyncChecker.status === DevicePhotosSyncCheckerStatus.COMPLETED
    ) {
      this.processNextGroupOfPhotosToRemoteCheck(true);
    }

    if (shouldFinish) {
      this.finishSync();
    }
  }

  /**
   * Finish the sync process
   */
  private finishSync() {
    this.updateStatus(PhotosSyncManagerStatus.COMPLETED);
  }

  /**
   * Called every time we receive a group of photos from the DevicePhotosScanner
   *
   * @param devicePhotos A list of photos retrieved from the device that needs to be checked
   */
  private onGroupOfPhotosReceived = (devicePhotos: DevicePhoto[]) => {
    this.addGroupOfPhotosToSyncChecker(devicePhotos);
  };

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
   * @param operation The operation with the result of the sync checking process
   */
  private onDevicePhotoSyncCheckResolved = async (operation: DevicePhotoSyncCheckOperation) => {
    // The sync checker found that the photo is already in sync,
    // we just notify via callback
    if (operation.syncStage === SyncStage.IN_SYNC) {
      this.totalPhotosSynced++;
      return this.onDevicePhotoSyncCompletedCallback(null, operation.uploadedPhoto || null);
    }

    // Photo was not in sync, to make sure, first we will
    // check if the photo exists remotely
    if (operation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
      this.addPhotoToRemoteCheck(operation.devicePhoto);
    }
  };

  /**
   * Adds a devicePhoto to be checked against the API, creating
   * group batches
   * @param devicePhoto Device Photo to be added to the batches
   */
  private addPhotoToRemoteCheck(devicePhoto: DevicePhoto) {
    if (!this.groupsOfPhotosToRemoteCheck.length) {
      this.groupsOfPhotosToRemoteCheck.push([]);
    }
    const groupIndexToFill = this.groupsOfPhotosToRemoteCheck.length - 1;

    const lastGroup = this.groupsOfPhotosToRemoteCheck[groupIndexToFill];

    if (lastGroup.length == this.config.checkIfExistsPhotosAmount) {
      this.groupsOfPhotosToRemoteCheck.push([devicePhoto]);
    } else {
      // Add the device photo to the last group
      this.groupsOfPhotosToRemoteCheck[groupIndexToFill].push(devicePhoto);
    }

    if (this.doingRemotePhotosCheck) return;
    this.processNextGroupOfPhotosToRemoteCheck();
  }

  private async processNextGroupOfPhotosToRemoteCheck(forceProcessFirstGroup?: boolean) {
    const firstGroup = this.groupsOfPhotosToRemoteCheck[0];

    if (!firstGroup) {
      return;
    }

    if (forceProcessFirstGroup || firstGroup.length === this.config.checkIfExistsPhotosAmount) {
      this.doingRemotePhotosCheck = true;
      const group = this.groupsOfPhotosToRemoteCheck.shift();
      if (group) {
        try {
          this.networkPhotosCheckQueue.push({ group });
        } catch (err) {
          errorService.reportError(err as Error, {
            tags: {
              photos_step: 'CHECKING_REMOTE_PHOTOS',
            },
          });
        }
      } else {
        this.checkIfFinishSync();
      }
    }
  }

  /**
   * Given a list of device photos, ask the API if they already exists in
   * the db
   *
   *
   * @param devicePhotos Device Photos to be checked
   * @returns The same list of photos with the server check result, in the same order
   */
  private async checkPhotosRemotely(devicePhotos: DevicePhoto[]) {
    return this.photosNetworkManager.getMissingRemotely(devicePhotos);
  }

  /**
   *
   * Given a group of photos checked previously remotely, starts the upload process adding
   * each photo to the PhotosNetworkManager upload queue
   *
   * @param devicePhotosRemotelyChecked Photos to upload previously checked against the API
   */
  private async uploadMissingDevicePhotos(devicePhotosRemotelyChecked: DevicePhotoRemoteCheck[]) {
    for (const photoToUpload of devicePhotosRemotelyChecked) {
      try {
        if (photoToUpload.exists && photoToUpload.photo) {
          this.totalPhotosSynced++;
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
        errorService.reportError(e as Error, {
          tags: {
            photos_step: 'UPLOAD_MISSING_PHOTOS',
          },
        });
      }
    }

    if (!this.photosNetworkManager.totalOperations) {
      this.doingRemotePhotosCheck = false;
    }
  }

  private async persistPhotoInSync(photo: Photo) {
    try {
      await this.photosLocalDb.persistPhotoSync(photo);
      this.totalPhotosSynced++;
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
        onOperationCompleted: async (err, resolvedOperation) => {
          if (err) {
            errorService.reportError(err as Error, {
              tags: {
                photos_step: 'ADD_PHOTO_TO_SYNC_CHECKER',
              },
            });
          }
          if (resolvedOperation) {
            await this.onDevicePhotoSyncCheckResolved(resolvedOperation);
          }
        },
      }),
    );
  }
}
