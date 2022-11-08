import { RunnableService } from '../../../../helpers/services';
import {
  DevicePhotoRemoteCheck,
  DevicePhotosOperationPriority,
  DevicePhotoSyncCheckOperation,
  PhotosItem,
  PhotosSyncManagerStatus,
  SyncStage,
} from '../../../../types/photos';

import { PhotosNetworkManager } from '../../network/PhotosNetworkManager';
import { DevicePhotosScannerService, DevicePhotosScannerStatus } from '../devicePhotosScanner/devicePhotosScanner';
import { DevicePhotosSyncCheckerService } from '../devicePhotosSyncChecker/devicePhotosSyncChecker';
import { Photo } from '@internxt/sdk/dist/photos';
import errorService from 'src/services/ErrorService';
import { AbortedOperationError, AsyncStorageKey } from 'src/types';
import { photosLocalDB } from '../../database';
import { photosLogger } from '../../logger';
import { photosNetwork } from '../../network/photosNetwork.service';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { ENABLE_PHOTOS_SYNC_MANAGER_LOGS, SAVE_LAST_PHOTOS_PAGE_PULLED } from '../../constants';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { photosUtils } from '../../utils';
import { photosPreview } from '../../preview';
import async from 'async';

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
  public totalPhotosFailed = 0;

  public gettingRemotePhotos = false;

  private onRemotePhotosSyncedCallback: (photosItemSynced: PhotosItem) => void = () => undefined;
  private onDevicePhotoSyncCompletedCallback: OnDevicePhotoSyncCompletedCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;
  private onTotalPhotosInDeviceCalculatedCallback: OnTotalPhotosCalculatedCallback = () => undefined;

  private previewsQueue = async.queue<Photo, Photo, Error>(async (task, next) => {
    // Check if we have the preview locally,
    // if not download and save it
    const photosItem = photosUtils.getPhotosItem(task);
    this.log('Saving photos item in DB');
    await photosLocalDB.savePhotosItem(task);
    const existsInDevice = this.devicePhotosScanner.getPhotoInDevice(photosItem.name, photosItem.takenAt)
      ? true
      : false;

    if (existsInDevice) {
      this.log('Photo exists in device, skipping preview download');
      next(null, task);
      return;
    }

    const existsPreviewFile = await fileSystemService.exists(photosItem.localPreviewPath);

    try {
      if (!existsPreviewFile) {
        this.log('Missing preview, downloading it');
        await photosPreview.getPreview(photosItem);
      }

      this.onRemotePhotosSyncedCallback(photosItem);
      this.log('Preview downloaded');

      return next(null, task);
    } catch (err) {
      this.log(`Preview download failed ${(err as Error).message}`);

      next(err as Error);
    }
  }, 1);
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

  getPendingTasks() {
    return this.photosNetworkManager.getPendingTasks();
  }

  async getRemotePhotos(page?: number) {
    try {
      this.gettingRemotePhotos = true;
      const lastPhotosPagePulled = SAVE_LAST_PHOTOS_PAGE_PULLED
        ? await asyncStorageService.getItem(AsyncStorageKey.LastPhotosPagePulled)
        : 1;

      const pageToPull = page ? page : lastPhotosPagePulled ? parseInt(lastPhotosPagePulled as string) : 1;
      this.log(`Getting remote photos page ${pageToPull}`);
      const { results } = await photosNetwork.getPhotos(pageToPull);

      this.previewsQueue.push(results);

      if (!this.isAborted && SAVE_LAST_PHOTOS_PAGE_PULLED) {
        await asyncStorageService.saveItem(AsyncStorageKey.LastPhotosPagePulled, pageToPull.toString());
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
    this.getRemotePhotos();
    this.startSync();
  }

  private async startSync() {
    this.devicePhotosScanner.run();
    this.photosNetworkManager.run();
    const synced = await photosLocalDB.getSyncedPhotos();
    this.totalPhotosSynced = synced.length;
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
    this.totalPhotosSynced = 0;
    this.totalPhotosInDevice = 0;
    this.pendingItemsToSync = 0;
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

  public onRemotePhotosSynced(callback: (photosItemSynced: PhotosItem) => void) {
    this.onRemotePhotosSyncedCallback = callback;
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
    const shouldFinish = this.devicePhotosSyncChecker.hasFinished && this.photosNetworkManager.hasFinished;

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
    if (operation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
      this.photosNetworkManager.addOperation({
        photosItem: operation.photosItem,
        retrys: 0,
        onOperationCompleted: async (err, photo) => {
          if (err) {
            this.totalPhotosFailed++;
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
  new PhotosNetworkManager(),
  new DevicePhotosSyncCheckerService(photosLocalDB),
);
