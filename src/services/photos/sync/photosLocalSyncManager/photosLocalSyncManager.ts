import { RunnableService } from '../../../../helpers/services';
import {
  DevicePhotoRemoteCheck,
  DevicePhotosOperationPriority,
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  PhotosItem,
  PhotosNetworkManagerStatus,
  PhotosSyncManagerStatus,
  SyncStage,
} from '../../../../types/photos';
import { PhotosNetworkManager } from '../../network/PhotosNetworkManager';
import {
  devicePhotosScanner,
  DevicePhotosScannerService,
  DevicePhotosScannerStatus,
} from '../devicePhotosScanner/devicePhotosScanner';
import { DevicePhotosSyncCheckerService } from '../devicePhotosSyncChecker/devicePhotosSyncChecker';
import { Photo } from '@internxt/sdk/dist/photos';
import errorService from 'src/services/ErrorService';
import { AbortedOperationError } from 'src/types';
import { PhotosRealmDB, photosRealmDB } from '../../database';
import { BaseLogger } from '@internxt-mobile/services/common';
import appService from '@internxt-mobile/services/AppService';

export type OnDevicePhotoSyncCompletedCallback = (error: Error | null, photosItem: PhotosItem | null) => void;
export type OnStatusChangeCallback = (status: PhotosSyncManagerStatus) => void;
export type OnTotalPhotosCalculatedCallback = (totalPhotos: number) => void;
export type OnPhotosCheckedRemotelyCallback = (photos: DevicePhotoRemoteCheck[]) => void;

export type PhotosSyncManagerConfig = {
  checkIfExistsPhotosAmount: number;
};
export class PhotosLocalSyncManager implements RunnableService<PhotosSyncManagerStatus> {
  public totalPhotosInDevice: number | null = null;
  public status: PhotosSyncManagerStatus = PhotosSyncManagerStatus.IDLE;
  private devicePhotosScanner: DevicePhotosScannerService;
  private devicePhotosSyncChecker: DevicePhotosSyncCheckerService;
  private photosNetworkManager: PhotosNetworkManager;
  private realmDB: PhotosRealmDB;

  private config: { enableLog: boolean };

  // The photos that are in the DB and are synced
  public totalPhotosThatAreAlreadySynced = 0;
  // The photos that are in the device, and not in the DB
  public totalPhotosThatNeedsSync = 0;
  // The photos that are synced since the PhotosLocalSyncManager STARTED
  public totalPhotosSynced = 0;
  // The photos that failed to sync
  public totalPhotosFailed = 0;

  private onDevicePhotoSyncCompletedCallback: OnDevicePhotoSyncCompletedCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;
  private onTotalPhotosInDeviceCalculatedCallback: OnTotalPhotosCalculatedCallback = () => undefined;

  private logger: BaseLogger;
  private initializeValues() {
    this.totalPhotosSynced = 0;
    this.totalPhotosFailed = 0;

    this.totalPhotosThatNeedsSync = 0;
    this.totalPhotosThatAreAlreadySynced = 0;
  }

  constructor(
    photosNetworkManager: PhotosNetworkManager,
    devicePhotosSyncChecker: DevicePhotosSyncCheckerService,
    config = { enableLog: true },
    devicePhotosScanner: DevicePhotosScannerService,
    realmDB: PhotosRealmDB,
  ) {
    this.devicePhotosScanner = devicePhotosScanner;
    this.devicePhotosSyncChecker = devicePhotosSyncChecker;
    this.photosNetworkManager = photosNetworkManager;
    this.realmDB = realmDB;
    this.config = config;
    this.logger = new BaseLogger({
      disabled: !config.enableLog,
      tag: 'PHOTOS_LOCAL_SYNC',
    });
    this.setupCallbacks();
  }

  async getDevicePhotos(cursor?: string, photosPerPage = 1000) {
    return this.devicePhotosScanner.getDevicePhotosItems(cursor, photosPerPage);
  }

  getSyncedPhotosCount() {
    return this.totalPhotosSynced + this.totalPhotosThatAreAlreadySynced;
  }
  getPhotosThatNeedsSyncCount() {
    return this.totalPhotosThatNeedsSync - this.totalPhotosSynced;
  }

  /**
   * Starts the PhotosSyncManager and set the status
   * to RUNNING, this method runs internally this services:
   *
   * - DevicePhotosScanner
   * - PhotosNetworkManager
   */
  public run(): void {
    this.initializeValues();
    this.log('Sync manager starting');
    this.startSync().catch((err) => {
      errorService.reportError(err);
    });
  }

  private async startSync() {
    this.updateStatus(PhotosSyncManagerStatus.RUNNING);

    this.devicePhotosScanner.run();
  }

  /**
   * Pauses the PhotosSyncManager and set the status
   * to PAUSED. This method pauses internally this services:
   *
   * - PhotosNetworkManager
   *
   * If the PhotosSyncManager is paused, no more photos will be uploaded,
   * the DevicePhotosSyncChecker and the DevicePhotosScanner will keep
   * running in the background, the ongoing operations won't be canceled
   */
  public pause(): void {
    this.log('Sync manager pausing');
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
    this.log('Sync manager resuming');
    this.photosNetworkManager.resume();
    this.updateStatus(PhotosSyncManagerStatus.RUNNING);
  }

  /**
   * Shutdown all the sync process, it emits status change
   * via callback
   */
  public destroy(): void {
    this.log('Sync manager destroying');
    this.devicePhotosSyncChecker.destroy();
    this.devicePhotosScanner.destroy();
    this.photosNetworkManager.destroy();
    this.updateStatus(PhotosSyncManagerStatus.ABORTED);
    this.onDevicePhotoSyncCompletedCallback = () => undefined;
    this.onStatusChangeCallback = () => undefined;
    this.onTotalPhotosInDeviceCalculatedCallback = () => undefined;
    this.totalPhotosSynced = 0;
    this.totalPhotosInDevice = 0;
    this.updateStatus(PhotosSyncManagerStatus.IDLE);
  }

  public get isAborted() {
    return this.status === PhotosSyncManagerStatus.ABORTED;
  }

  /**
   * Updates the PhotosSyncManager internal status, notifies
   * via callback the new status
   * @param status New status
   */
  public updateStatus(newStatus: PhotosSyncManagerStatus) {
    if (this.status === newStatus) return;
    this.log(`Sync manager status change ${this.status} -> ${newStatus}`);
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

  public onPhotosItemUploadStart(callback: (photosItem: PhotosItem) => void) {
    this.photosNetworkManager.onUploadStart(callback);
  }

  public onPhotosItemUploadProgress(callback: (photosItem: PhotosItem, progress: number) => void) {
    this.photosNetworkManager.onUploadProgress(callback);
  }

  private setupCallbacks() {
    // Transfer the groups of photos received from the DevicePhotosScannerService
    // to the DevicePhotosSyncCheckerService
    this.devicePhotosScanner.onGroupOfPhotosReady(this.onGroupOfPhotosReceived);

    // Gets the total amount of photos in the device available for sync,
    // this is the total amount of photos available in the device,
    // NOT the not synchronized photos
    this.devicePhotosScanner.onTotalPhotosCalculated((total) => {
      this.log(`Received photos from device scanner, total: ${total} photos`);
      this.totalPhotosInDevice = total;
      this.onTotalPhotosInDeviceCalculatedCallback(total);
    });

    this.devicePhotosScanner.onStatusChange((status) => {
      if (status === DevicePhotosScannerStatus.NO_PHOTOS_IN_DEVICE) {
        this.updateStatus(PhotosSyncManagerStatus.NO_PHOTOS_TO_SYNC);
        this.checkIfFinishSync();
      }
    });

    // Listen for DevicePhotosSyncChecker status changes
    this.devicePhotosSyncChecker.onStatusChange((status) => {
      if (status === DevicePhotosSyncCheckerStatus.COMPLETED) {
        this.checkIfFinishSync();
      }
    });

    // Listen for PhotosNetworkManager status changes
    this.photosNetworkManager.onStatusChange((status) => {
      if (status === PhotosNetworkManagerStatus.COMPLETED) {
        this.checkIfFinishSync();
      }
    });
  }

  /**
   * Check if the PhotosSyncManager should finish the sync process
   * because all the managed services are done with their work or
   * are just IDLE
   */
  private checkIfFinishSync(enableLog = false) {
    const finish = () => {
      this.log('Sync manager should finish now');
      this.finishSync();
    };
    // If the devicePhotosScanner finished, and theres no photos, finish
    if (this.devicePhotosScanner.hasFinished && !this.totalPhotosInDevice) {
      finish();
    }
    if (this.status === PhotosSyncManagerStatus.COMPLETED) return;
    const shouldFinish =
      this.devicePhotosSyncChecker.hasFinished &&
      this.photosNetworkManager.hasFinished &&
      this.devicePhotosScanner.hasFinished;

    if (enableLog) {
      this.logger.info(`[DevicePhotosSyncChecker] status is ${this.devicePhotosSyncChecker.status}`);
      this.logger.info(`[PhotosNetworkManager] status is ${this.photosNetworkManager.status}`);
      this.logger.info(`[DevicePhotosScanner] status is ${this.devicePhotosScanner.status}`);
    }

    if (shouldFinish) {
      finish();
    }
  }

  /**
   * Finish the sync process
   */
  private finishSync() {
    this.updateStatus(PhotosSyncManagerStatus.COMPLETED);
    this.log('--- Sync is finished ---');
  }

  /**
   * Called every time we receive a group of photos from the DevicePhotosScanner
   *
   * @param devicePhotos A list of photos retrieved from the device that needs to be checked
   */
  private onGroupOfPhotosReceived = (devicePhotos: PhotosItem[]) => {
    this.addGroupOfPhotosToSyncChecker(devicePhotos);
  };

  /**
   * Called when a operation sync check is finished via the DevicePhotosSyncChecker,
   * each operation contains a syncStage with the current stage of the photo
   *
   * if the operation sync stage is NEEDS_REMOTE_CHECK photo will be included
   * in the PhotosNetworkManager queue to be uploaded.
   *
   * NEEDS_REMOTE_CHECK -> Means we need to ask the server if the photo exists
   * IN_SYNC -> Means the photo was found in a sync stage locally, no further action
   * is required
   *
   *
   * @param operation The operation with the result of the sync checking process
   */
  private onDevicePhotoSyncCheckResolved = async (operation: DevicePhotoSyncCheckOperation) => {
    if (operation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
      this.photosNetworkManager.addOperation({
        photosItem: operation.photosItem,
        retries: 0,
        useNativePhotos: appService.isAndroid,
        onOperationCompleted: (err, result) => {
          // If we are on Android, result will be null, so we update the item and we will
          // wait for the event to mark the photo as backed up
          if (appService.isAndroid) {
            this.totalPhotosSynced = this.totalPhotosSynced + 1;
            this.onDevicePhotoSyncCompletedCallback(null, null);
          }
          if (err) {
            if (err instanceof AbortedOperationError) {
              // This is used to stop the tasks, is not an error at all
              // since is thrown on purpose, so just log it, but don't bubble it

              this.logger.info('Upload task was aborted');
            }
            this.totalPhotosFailed++;
            this.onDevicePhotoSyncCompletedCallback(err, null);
          }
          if (result) {
            this.totalPhotosSynced = this.totalPhotosSynced + 1;
            this.savePhotoInSync(result.photo, result.photosItem).catch((err) => {
              errorService.reportError(err);
            });
          }
        },
      });
    }
  };

  private async savePhotoInSync(photo: Photo, photosItem: PhotosItem) {
    try {
      if (this.isAborted) {
        throw new AbortedOperationError();
      }

      await this.realmDB.savePhotosItem(photo);
      this.devicePhotoSyncSuccess(photosItem);
    } catch (err) {
      this.devicePhotoSyncFailed(err as Error);
    }
  }

  private addGroupOfPhotosToSyncChecker(photosItems: PhotosItem[]) {
    photosItems.forEach((photosItem) =>
      this.devicePhotosSyncChecker.addOperation({
        photosItem,
        priority: DevicePhotosOperationPriority.NORMAL,
        onOperationCompleted: (err, resolvedOperation) => {
          if (err) {
            errorService.reportError(err as Error, {
              tags: {
                photos_step: 'ADD_PHOTO_TO_SYNC_CHECKER',
              },
            });
          }

          if (resolvedOperation) {
            if (
              resolvedOperation.syncStage === SyncStage.NEEDS_REMOTE_CHECK &&
              this.photosNetworkManager.status === PhotosNetworkManagerStatus.IDLE
            ) {
              this.photosNetworkManager.run();
            }

            if (resolvedOperation.syncStage === SyncStage.IN_SYNC) {
              this.totalPhotosThatAreAlreadySynced = this.totalPhotosThatAreAlreadySynced + 1;
            }

            if (resolvedOperation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
              this.totalPhotosThatNeedsSync = this.totalPhotosThatNeedsSync + 1;
            }

            this.onDevicePhotoSyncCheckResolved(resolvedOperation).catch((err) => {
              errorService.reportError(err);
            });
          }
        },
      }),
    );

    this.devicePhotosSyncChecker.run();
  }

  private devicePhotoSyncSuccess(photosItem?: PhotosItem) {
    this.onDevicePhotoSyncCompletedCallback(null, photosItem || null);
  }

  private devicePhotoSyncFailed(error: Error) {
    this.onDevicePhotoSyncCompletedCallback(error, null);
  }

  private log(message: string) {
    this.logger.info(message);
  }
}

export const photosLocalSync = new PhotosLocalSyncManager(
  new PhotosNetworkManager(),
  new DevicePhotosSyncCheckerService(photosRealmDB),
  { enableLog: true },
  devicePhotosScanner,
  photosRealmDB,
);
