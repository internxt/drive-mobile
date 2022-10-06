import { PhotosNetworkManagerStatus, PhotosNetworkOperation } from '../../../types/photos';

import async from 'async';
import { Photo, PhotoPreviewType } from '@internxt/sdk/dist/photos';
import { RunnableService } from '../../../helpers/services';
import fileSystemService from '../../FileSystemService';
import { ENABLE_PHOTOS_NETWORK_MANAGER_LOGS, PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY } from '../constants';
import { SdkManager } from '@internxt-mobile/services/common';
import { AbortedOperationError } from 'src/types';
import { Platform } from 'react-native';
import { photosNetwork } from './photosNetwork.service';
import AuthService from '@internxt-mobile/services/AuthService';
import { photosUtils } from '../utils';
import { photosLogger } from '../logger';
import { photosPreview } from '../preview';
import { photosUser } from '../user';
import { photosLocalDB } from '../database/photosLocalDB';
export type OnStatusChangeCallback = (status: PhotosNetworkManagerStatus) => void;
export type OperationResult = Photo;

/**
 * Manages the upload process for each photo using a queue
 *
 * For each photo that comes into the queue:
 *
 * Generates a preview -> Generates a photo payload with the uploaded preview -> Uploads the photo -> Resolves the operation
 */
export class PhotosNetworkManager implements RunnableService<PhotosNetworkManagerStatus> {
  public status = PhotosNetworkManagerStatus.IDLE;

  private logger = photosLogger;
  // eslint-disable-next-line
  private onStatusChangeCallback: OnStatusChangeCallback = () => {};
  private sdk: SdkManager;
  private options: { enableLog: boolean };
  private queue = async.queue<PhotosNetworkOperation, Photo | null, Error>((task, next) => {
    if (this.isAborted) {
      throw new AbortedOperationError();
    }

    this.wrapWithDuration(task)
      .then((result) => {
        next(null, result);
      })
      .catch((err) => {
        next(err, null);
      });
  }, PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY);

  constructor(sdk: SdkManager, options = { enableLog: ENABLE_PHOTOS_NETWORK_MANAGER_LOGS }) {
    this.sdk = sdk;
    this.options = options;
    this.queue.drain(() => {
      this.updateStatus(PhotosNetworkManagerStatus.COMPLETED);
    });
  }
  public onStatusChange(callback: OnStatusChangeCallback) {
    this.onStatusChangeCallback = callback;
  }

  public updateStatus(status: PhotosNetworkManagerStatus): void {
    if (this.status === status) return;
    this.log(`Network manager status change ${this.status} -> ${status}`);
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public run() {
    this.log('Network manager starting');
    this.queue.resume();
  }

  public restart() {
    return;
  }

  public destroy() {
    this.queue.kill();
    this.updateStatus(PhotosNetworkManagerStatus.ABORTED);
  }

  public resume() {
    this.queue.resume();
    if (!this.totalOperations) {
      this.updateStatus(PhotosNetworkManagerStatus.COMPLETED);
    } else {
      this.updateStatus(PhotosNetworkManagerStatus.RUNNING);
    }
  }

  public pause(): void {
    this.queue.pause();
    this.updateStatus(PhotosNetworkManagerStatus.PAUSED);
  }

  public get totalOperations() {
    return this.queue.length();
  }

  /**
   * Starts and upload a given photo based on the operation data
   *
   * @param operation Operation to create the upload from
   * @returns The result of the operation
   */
  public async processUploadOperation(operation: PhotosNetworkOperation): Promise<OperationResult | null> {
    const { credentials } = await AuthService.getAuthCredentials();
    const device = photosUser.getDevice();
    const user = photosUser.getUser();
    if (!device) throw new Error('Photos device not found');
    if (!user) throw new Error('Photos user not found');
    if (!operation.photosItem.localUri) throw new Error('Local uri not found');
    // 1. Get photo data and the hash
    const photoData = operation.photosItem;
    const name = photoData.name;
    operation.photosItem.localUri = await photosUtils.cameraRollUriToFileSystemUri(
      {
        name: operation.photosItem.name,
        type: operation.photosItem.format,
      },
      operation.photosItem.localUri,
    );
    const hash = (
      await photosUtils.getPhotoHash(credentials.user.userId, name, photoData.takenAt, operation.photosItem.localUri)
    ).toString('hex');

    // 2. Make sure in the meantime, the photo was not pulled from the server, avoid network hits
    const syncedPhoto = await photosLocalDB.getSyncedPhotoByHash(hash);
    if (syncedPhoto?.photo) {
      this.log('Photo matched by hash, skipping upload');
      return syncedPhoto.photo;
    }
    const startAt = Date.now();

    this.log(`--- UPLOADING ${name} ---`);
    // 3. Upload the preview
    const preview = await photosPreview.generate(photoData);
    const previewGeneratedElapsed = Date.now() - startAt;
    this.log(`Preview generated in ${previewGeneratedElapsed / 1000}s`);

    const previewId = await photosNetwork.uploadPreview(preview.path);

    const uploadGeneratedElapsed = Date.now() - (previewGeneratedElapsed + startAt);
    this.log(`Preview uploaded in ${uploadGeneratedElapsed / 1000}s`);

    const photoPath = await photosUtils.cameraRollUriToFileSystemUri(
      { name: photoData.name, type: photoData.format },
      photoData.localFullSizePath,
    );

    this.log('Hash for photo generated');
    // 4. Upload the photo
    const photo = await photosNetwork.upload(operation.photosItem.localUri, {
      name,
      width: photoData.width,
      height: photoData.height,
      deviceId: device.id,
      hash,
      takenAt: new Date(photoData.takenAt),
      previewId,
      previews: [
        {
          width: preview.width,
          height: preview.height,
          size: preview.size,
          fileId: previewId,
          type: preview.type as PhotoPreviewType,
        },
      ],
      type: photoData.format,
      userId: user.id,
      size: parseInt((await fileSystemService.statRNFS(operation.photosItem.localUri)).size),
    });
    const photoUploadedElapsed = Date.now() - (uploadGeneratedElapsed + previewGeneratedElapsed + startAt);
    this.log(`Photo uploaded successfully in ${photoUploadedElapsed / 1000}s`);
    /**
     * On iOS, the camera roll assets needs to be copied
     * from another location so here we remove the copy
     */
    if (Platform.OS === 'ios') {
      await fileSystemService.unlinkIfExists(photoPath);
    }

    const totalElapsed = Date.now() - startAt;
    this.log(`--- TOTAL  ${totalElapsed / 1000}s ---\n`);

    return photo;
  }

  addOperation(operation: PhotosNetworkOperation) {
    this.queue.push<OperationResult>(operation, (err, photo) => {
      operation.onOperationCompleted(err || null, photo || null);
    });

    this.updateStatus(PhotosNetworkManagerStatus.RUNNING);
  }

  getPendingTasks() {
    return this.queue.length();
  }

  private async wrapWithDuration(operation: PhotosNetworkOperation) {
    return new Promise<Photo | null>((resolve, reject) => {
      const start = Date.now();
      const timeout = 1000;
      let error: unknown | null = null;
      let result: Photo | null = null;

      this.processUploadOperation(operation)
        .then((photo) => {
          result = photo;
        })
        .catch((err) => {
          error = err;
        })
        .finally(() => {
          const duration = Date.now() - start;
          if (duration < timeout) {
            setTimeout(() => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }, timeout - duration);
          } else {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        });
    });
  }

  private get isAborted() {
    return this.status === PhotosNetworkManagerStatus.ABORTED;
  }

  private log(message: string) {
    if (this.options.enableLog) {
      this.logger.info(message);
    }
  }
}
