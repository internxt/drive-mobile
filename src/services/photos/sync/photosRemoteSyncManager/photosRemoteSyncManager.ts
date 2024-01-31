import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { BaseLogger } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { PhotosItem, PhotosRemoteSyncManagerStatus } from '@internxt-mobile/types/photos';
import { Photo } from '@internxt/sdk/dist/photos';
import async from 'async';
import { RunnableService } from 'src/helpers/services';
import { MAX_PREVIEW_DOWNLOAD_RETRIES, REMOTE_PHOTOS_PER_PAGE } from '../../constants';
import { photosRealmDB } from '../../database';
import { photosNetwork } from '../../network/photosNetwork.service';
import { photosPreview } from '../../preview';
import { photosUtils } from '../../utils';
import { devicePhotosScanner, DevicePhotosScannerService } from '../devicePhotosScanner';
import { PhotosPreviewFixerService } from '../../preview/PhotosPreviewFixer.service';

type OnStatusChangeCallback = (newStatus: PhotosRemoteSyncManagerStatus) => void;
type OnRemotePhotosPageSyncedCallback = (photo: Photo[]) => void;
export class PhotosRemoteSyncManager implements RunnableService<PhotosRemoteSyncManagerStatus> {
  private logger: BaseLogger;
  private totalPhotosSyncedFromRemote = 0;
  private lastPhotoPulledDate: Date | null = null;
  private onStatusChangeCallback: OnStatusChangeCallback = () => {
    /** NOOP */
  };

  private onRemotePhotosPageSyncedCallback: OnRemotePhotosPageSyncedCallback = () => {
    /** NOOP */
  };
  public status: PhotosRemoteSyncManagerStatus = PhotosRemoteSyncManagerStatus.IDLE;
  constructor(private devicePhotosScanner: DevicePhotosScannerService) {
    this.logger = new BaseLogger({
      tag: 'PHOTOS_REMOTE_SYNC',
    });
  }
  private previewsQueue = async.queue<{ photo: Photo; retries: number }, Photo, Error>(async (task, next) => {
    const startTaskTime = Date.now();
    let photosItem: PhotosItem = photosUtils.getPhotosItem(task.photo);
    // Check if we have the preview locally,
    // if not download and save it
    try {
      let photo: Photo = task.photo;

      const photoPreviewNeedsFix = PhotosPreviewFixerService.instance.needsFixing(photo);

      if (photoPreviewNeedsFix) {
        this.logger.info(`🔨 Photo ${photo.name} created at ${photo.createdAt} preview needs fixing, fixing it`);
        photo = await PhotosPreviewFixerService.instance.fix(task.photo);
        photosItem = photosUtils.getPhotosItem(photo);
        this.logger.info('✅ Photo preview has been fixed');
      }
      await photosRealmDB.savePhotosItem(photo, false);

      const existsInDevice = this.devicePhotosScanner.getPhotoInDevice(photosItem.name, photosItem.takenAt)
        ? true
        : false;

      if (existsInDevice) {
        this.logger.info(
          `Photo exists in device, skipping preview download, task done in ${Date.now() - startTaskTime}ms`,
        );

        // We are done, save the date
        await asyncStorageService.saveLastPhotoPulledDate(photo.updatedAt);
        next(null, photo);

        // Exists in device, add the photo
        this.totalPhotosSyncedFromRemote++;
        return;
      }
    } catch (err) {
      this.logger.error(`Error preparing preview ${(err as Error).message}`);
      next(err as Error);
      return;
    }

    this.logger.info(
      `Checking if preview exists at ${photosItem.localPreviewPath}, ${this.previewsQueue.length()} pending items`,
    );
    const existsPreviewFile = await fs.exists(photosItem.localPreviewPath);

    try {
      if (!existsPreviewFile) {
        this.logger.info('Missing preview, downloading it');
        await photosPreview.getPreview(photosItem);
      }
      // Downloaded already, add photo
      this.totalPhotosSyncedFromRemote++;

      this.logger.info(`Preview ready, task done in ${Date.now() - startTaskTime}ms`);
      // We are done, save the date
      await asyncStorageService.saveLastPhotoPulledDate(task.photo.updatedAt);
      return next(null, task.photo);
    } catch (err) {
      this.logger.error(`Preview download failed ${(err as Error).message}`);

      // Retry the preview download, or fail, we cannot wait for all the previews
      // to be downloaded, since we don't save the failed ones, we just retry the task
      // if no success, we will go to the next Photos page ignoring the failed ones
      // Note that No preview is not the same as no photo in the view, the photo and the
      // metadata will appear, but not the preview image. GalleryItem component has a mechanism
      // to detect failing previews and retry the download
      if (task.retries < MAX_PREVIEW_DOWNLOAD_RETRIES) {
        this.logger.error(`Retrying download, this is the retry ${task.retries + 1}`);
        this.previewsQueue.push({
          photo: task.photo,
          retries: task.retries + 1,
        });
      } else {
        this.logger.error('Max retrys reached, ignoring preview and reporting error');
        errorService.reportError(err);
      }

      next(err as Error);
    }
  }, 3);

  onStatusChange(callback: OnStatusChangeCallback) {
    this.onStatusChangeCallback = callback;
  }

  onRemotePhotosPageSynced(callback: OnRemotePhotosPageSyncedCallback) {
    this.onRemotePhotosPageSyncedCallback = callback;
  }
  resume() {
    this.previewsQueue.resume();
  }
  pause() {
    this.previewsQueue.pause();
  }

  async run() {
    if (this.status === PhotosRemoteSyncManagerStatus.SYNCING) {
      throw new Error('Remote photos sync manager is already running, avoid calling run() twice');
    }
    try {
      this.lastPhotoPulledDate = await asyncStorageService.getLastPhotoPulledDate();

      this.getRemotePhotos(this.lastPhotoPulledDate ? this.lastPhotoPulledDate : undefined);
    } catch (error) {
      this.logger.error(`Failed to start the remote sync manager ${(error as Error).message}`);
      errorService.reportError(error);
      this.updateStatus(PhotosRemoteSyncManagerStatus.ABORTED);
    }
  }

  updateStatus(newStatus: PhotosRemoteSyncManagerStatus): void {
    if (this.status === newStatus) return;
    this.logger.info(`Remote Sync manager status change ${this.status} -> ${newStatus}`);
    this.status = newStatus;
    this.onStatusChangeCallback(newStatus);
  }

  private async getRemotePhotos(fromDate?: Date) {
    try {
      const startTime = Date.now();
      this.updateStatus(PhotosRemoteSyncManagerStatus.SYNCING);

      if (fromDate) {
        this.logger.info(`Last remote photo pulled was created on ${fromDate.toLocaleDateString('es')}`);
      } else {
        this.logger.info('No from date provided, pulling from the beginning');
      }

      const { results } = await photosNetwork.getPhotosSorted(fromDate ? fromDate : new Date('2000-01-01'));
      this.logger.info(`Found ${results.length} photos from this date`);

      // Wait for the previews to be processed
      await this.previewsQueue.push(results.map((result) => ({ photo: result, retries: 0 })));

      // If the queue is busy, wait for it to finish
      if (!this.previewsQueue.idle()) {
        await this.previewsQueue.drain();
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const average = totalTime / results.length || 1;
      this.onRemotePhotosPageSyncedCallback(results);
      this.logger.info(`${results.length} photos processed in ${totalTime}ms, average time is ${average}ms`);
      if (!results.length) {
        this.logger.info('No more pages found');
        this.logger.info(`Remotely synced with the device ${this.totalPhotosSyncedFromRemote} photos`);
        // Mark as synced
        this.updateStatus(PhotosRemoteSyncManagerStatus.SYNCED);
      } else {
        const nextDate = await asyncStorageService.getLastPhotoPulledDate();
        if (!nextDate) {
          this.getRemotePhotos();
        } else {
          if (results.length === REMOTE_PHOTOS_PER_PAGE) {
            this.getRemotePhotos(nextDate);
          } else {
            this.logger.info('Remote sync is done');
            this.updateStatus(PhotosRemoteSyncManagerStatus.SYNCED);
          }
        }
      }
    } catch (error) {
      errorService.reportError(error);
      this.logger.error(`Get remote photos failed ${(error as Error).message}`);
      if (this.previewsQueue.idle()) {
        this.updateStatus(PhotosRemoteSyncManagerStatus.SYNCED);
      }
    }
  }
}

export const photosRemoteSync = new PhotosRemoteSyncManager(devicePhotosScanner);
