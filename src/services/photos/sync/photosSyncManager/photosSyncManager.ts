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
import { DevicePhotosScannerService, DevicePhotosScannerStatus } from '../devicePhotosScanner/devicePhotosScanner';
import { DevicePhotosSyncCheckerService } from '../devicePhotosSyncChecker/devicePhotosSyncChecker';
import { Photo } from '@internxt/sdk/dist/photos';
import errorService from 'src/services/ErrorService';
import { AbortedOperationError, AsyncStorageKey } from 'src/types';
import { SdkManager } from '@internxt-mobile/services/common';
import { photosLocalDB } from '../../database';
import { photosLogger } from '../../logger';
import { photosNetwork } from '../../network/photosNetwork.service';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { ENABLE_PHOTOS_SYNC_MANAGER_LOGS } from '../../constants';

export type OnDevicePhotoSyncCompletedCallback = (error: Error | null, photo: Photo | null) => void;
export type OnStatusChangeCallback = (status: PhotosSyncManagerStatus) => void;
export type OnTotalPhotosCalculatedCallback = (totalPhotos: number) => void;
export type OnPhotosCheckedRemotelyCallback = (photos: DevicePhotoRemoteCheck[]) => void;

export type PhotosSyncManagerConfig = {
  checkIfExistsPhotosAmount: number;
};
export class PhotosSyncManager implements RunnableService<PhotosSyncManagerStatus> {
  public totalPhotosInDevice: number | null = null;
  public status: PhotosSyncManagerStatus = PhotosSyncManagerStatus.IDLE;
  private devicePhotosScanner: DevicePhotosScannerService;
  private devicePhotosSyncChecker: DevicePhotosSyncCheckerService;
  private photosNetworkManager: PhotosNetworkManager;
  private config: { enableLog: boolean };
  public pendingItemsToSync = 0;
  public totalPhotosSynced = 0;
  public gettingRemotePhotos = false;

  private onDevicePhotoSyncCompletedCallback: OnDevicePhotoSyncCompletedCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;
  private onTotalPhotosInDeviceCalculatedCallback: OnTotalPhotosCalculatedCallback = () => undefined;

  constructor(
    photosNetworkManager: PhotosNetworkManager,
    devicePhotosSyncChecker: DevicePhotosSyncCheckerService,
    config = { enableLog: ENABLE_PHOTOS_SYNC_MANAGER_LOGS },
  ) {
    this.devicePhotosScanner = new DevicePhotosScannerService();
    this.devicePhotosSyncChecker = devicePhotosSyncChecker;
    this.photosNetworkManager = photosNetworkManager;
    this.config = config;
    this.setupCallbacks();
  }

  async getDevicePhotos(cursor?: string, photosPerPage = 1000) {
    return this.devicePhotosScanner.getDevicePhotosItems(cursor, photosPerPage);
  }

  async getRemotePhotos(page?: number) {
    try {
      this.gettingRemotePhotos = true;
      const lastPhotosPagePulled = await asyncStorageService.getItem(AsyncStorageKey.LastPhotosPagePulled);

      const pageToPull = page ? page : lastPhotosPagePulled ? parseInt(lastPhotosPagePulled as string) : 1;
      this.log(`Getting remote photos page ${pageToPull}`);
      const { results } = await photosNetwork.getPhotos(pageToPull);

      await asyncStorageService.saveItem(AsyncStorageKey.LastPhotosPagePulled, pageToPull.toString());

      for (const result of results) {
        await this.savePhotoInSync(result, false);
      }

      if (results.length) {
        await this.getRemotePhotos(pageToPull + 1);
      } else {
        this.log('No more pages found');
        this.gettingRemotePhotos = false;
      }
    } catch (e) {
      this.log(`Get remote photos failed ${(e as Error).message}`);
      this.gettingRemotePhotos = false;
    }
  }

  /**
   * Starts the PhotosSyncManager and set the status
   * to RUNNING, this method runs internally this services:
   *
   * - DevicePhotosScanner
   * - PhotosNetworkManager
   */
  public run(): void {
    this.log('Sync manager starting');
    this.devicePhotosScanner.run();
    this.photosNetworkManager.run();
    this.updateStatus(PhotosSyncManagerStatus.RUNNING);
    this.getRemotePhotos();
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
    this.updateStatus(PhotosSyncManagerStatus.ABORTED);
    this.totalPhotosSynced = 0;
    this.totalPhotosInDevice = 0;
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

  private setupCallbacks() {
    // Transfer the groups of photos received from the DevicePhotosScannerService
    // to the DevicePhotosSyncCheckerService
    this.devicePhotosScanner.onGroupOfPhotosReady(this.onGroupOfPhotosReceived);

    // Gets the total amount of photos in the device available for sync,
    // this is the total amount of photos available in the device,
    // NOT the not synchronized photos
    this.devicePhotosScanner.onTotalPhotosCalculated((total) => {
      this.log(`Received photos from device scanner, total: ${total} photos`);
      this.pendingItemsToSync = total;
      this.totalPhotosInDevice = total;
      this.onTotalPhotosInDeviceCalculatedCallback(total);
      this.checkIfFinishSync();
    });

    this.devicePhotosScanner.onStatusChange((status) => {
      switch (status) {
        case DevicePhotosScannerStatus.COMPLETED:
          break;
      }
      this.checkIfFinishSync();
    });

    // Listen for DevicePhotosSyncChecker status changes
    this.devicePhotosSyncChecker.onStatusChange(() => {
      this.checkIfFinishSync();
    });

    // Listen for PhotosNetworkManager status changes
    this.photosNetworkManager.onStatusChange(() => {
      this.checkIfFinishSync();
    });
  }

  /**
   * Check if the PhotosSyncManager should finish the sync process
   * because all the managed services are done with their work or
   * are just IDLE
   */
  private checkIfFinishSync() {
    if (this.status === PhotosSyncManagerStatus.COMPLETED) return;
    const shouldFinish =
      this.devicePhotosSyncChecker.status === DevicePhotosSyncCheckerStatus.COMPLETED &&
      (this.photosNetworkManager.status === PhotosNetworkManagerStatus.COMPLETED ||
        this.photosNetworkManager.status === PhotosNetworkManagerStatus.IDLE);

    if (shouldFinish) {
      this.log('Sync manager should finish now');
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
    if (operation.syncStage === SyncStage.IN_SYNC) {
      return this.devicePhotoSyncSuccess(operation.syncedPhoto);
    }

    if (operation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
      this.photosNetworkManager.addOperation({
        photosItem: operation.photosItem,
        onOperationCompleted: async (err, photo) => {
          if (err) {
            this.onDevicePhotoSyncCompletedCallback(err, null);
          }
          if (photo) {
            this.savePhotoInSync(photo);
          }
        },
      });
    }
  };

  private async savePhotoInSync(photo: Photo, countPhoto = true) {
    try {
      if (this.isAborted) {
        throw new AbortedOperationError();
      }
      await photosLocalDB.savePhotosItem(photo);

      this.devicePhotoSyncSuccess(photo, countPhoto);
    } catch (err) {
      this.devicePhotoSyncFailed(err as Error);
    }
  }

  private addGroupOfPhotosToSyncChecker(photosItems: PhotosItem[]) {
    photosItems.forEach((photosItem) =>
      this.devicePhotosSyncChecker.addOperation({
        photosItem,
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

  private devicePhotoSyncSuccess(photo?: Photo, countPhoto = false) {
    if (countPhoto) {
      this.totalPhotosSynced++;
      this.pendingItemsToSync--;
    }

    this.onDevicePhotoSyncCompletedCallback(null, photo || null);
    this.checkIfFinishSync();
  }

  private devicePhotoSyncFailed(error: Error) {
    this.onDevicePhotoSyncCompletedCallback(error, null);
  }

  private log(message: string) {
    if (!this.config.enableLog) return;
    photosLogger.info(message);
  }
}

export const photosSync = new PhotosSyncManager(
  new PhotosNetworkManager(SdkManager.getInstance()),
  new DevicePhotosSyncCheckerService(photosLocalDB),
);
