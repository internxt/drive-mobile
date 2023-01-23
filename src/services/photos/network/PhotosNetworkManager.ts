import { PhotosItem, PhotoSizeType, PhotosNetworkManagerStatus, PhotosNetworkOperation } from '../../../types/photos';
import async from 'async';
import { Photo, PhotoPreviewType } from '@internxt/sdk/dist/photos';
import { RunnableService, sleep } from '../../../helpers/services';
import fileSystemService from '../../FileSystemService';
import {
  ENABLE_PHOTOS_NETWORK_MANAGER_LOGS,
  MAX_UPLOAD_RETRIES,
  PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY,
} from '../constants';
import { AbortedOperationError } from 'src/types';
import { Platform } from 'react-native';
import { photosNetwork } from './photosNetwork.service';
import AuthService from '@internxt-mobile/services/AuthService';
import { photosUtils } from '../utils';
import { photosLogger } from '../logger';
import { photosPreview } from '../preview';
import { photosUser } from '../user';
import { photosRealmDB } from '../database';
export type OnStatusChangeCallback = (status: PhotosNetworkManagerStatus) => void;
export type OperationResult = Photo;
export type OnUploadStartCallback = (photosItem: PhotosItem) => void;
export type OnUploadProgressCallback = (photosItem: PhotosItem, progress: number) => void;

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
  // eslint-disable-next-line
  private onUploadStartCallback: OnUploadStartCallback = () => {};
  // eslint-disable-next-line
  private onUploadProgressCallback: OnUploadProgressCallback = () => {};
  private options: { enableLog: boolean };
  private queue = this.createQueue();
  private abortController: AbortController;
  constructor(options = { enableLog: ENABLE_PHOTOS_NETWORK_MANAGER_LOGS }) {
    this.options = options;
    this.abortController = new AbortController();
  }

  private createQueue() {
    const queue = async.queue<PhotosNetworkOperation, Photo | null, Error>(async (task, next) => {
      if (this.abortController.signal.aborted) {
        next(new AbortedOperationError(), null);
        return;
      }

      try {
        const result = await this.processUploadOperation(task);
        await sleep(100);
        next(null, result);
      } catch (err) {
        if (task.retries === MAX_UPLOAD_RETRIES) {
          await sleep(100);
          next(err as Error, null);
        } else {
          this.addOperation({
            ...task,
            retries: task.retries + 1,
          });
          await sleep(100);
          next(err as Error, null);
        }
      }
    }, PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY);

    queue.drain(() => {
      this.updateStatus(PhotosNetworkManagerStatus.COMPLETED);
    });

    return queue;
  }

  public onStatusChange(callback: OnStatusChangeCallback) {
    this.onStatusChangeCallback = callback;
  }

  public onUploadStart(callback: OnUploadStartCallback) {
    this.onUploadStartCallback = callback;
  }

  public onUploadProgress(callback: OnUploadProgressCallback) {
    this.onUploadProgressCallback = callback;
  }

  public updateStatus(status: PhotosNetworkManagerStatus): void {
    if (this.status === status) return;
    this.log(`Network manager status change ${this.status} -> ${status}`);
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public run() {
    this.updateStatus(PhotosNetworkManagerStatus.RUNNING);
    this.log('Network manager starting');
    this.queue.resume();
  }

  public restart() {
    return;
  }

  public destroy() {
    this.queue.kill();
    this.abortController.abort('User requested PhotosRemoteNetworkManager destroy');
    this.updateStatus(PhotosNetworkManagerStatus.ABORTED);
    this.queue = this.createQueue();
    this.updateStatus(PhotosNetworkManagerStatus.IDLE);
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

  public get hasFinished() {
    if (this.status === PhotosNetworkManagerStatus.IDLE && this.queue.idle()) return true;
    return this.status === PhotosNetworkManagerStatus.COMPLETED && this.queue.idle() && this.totalOperations === 0;
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
    this.onUploadStartCallback(operation.photosItem);
    const stopIfAborted = () => {
      if (this.abortController.signal.aborted) {
        throw new AbortedOperationError();
      }
    };
    const { credentials } = await AuthService.getAuthCredentials();
    const device = photosUser.getDevice();
    const user = photosUser.getUser();
    if (!device) throw new Error('Photos device not found');
    if (!user) throw new Error('Photos user not found');
    if (!operation.photosItem.localUri) throw new Error('Local uri not found');

    // Make sure the photo is not in the DB by name and date, hash generation
    // is a bit intensive
    const photoInDB = await photosRealmDB.getSyncedPhotoByNameAndDate(
      operation.photosItem.name,
      operation.photosItem.takenAt,
    );

    if (photoInDB) {
      return photoInDB;
    }
    // 1. Get photo data and the hash
    const photoData = operation.photosItem;
    const name = photoData.name;

    const localUriToPath = await photosUtils.cameraRollUriToFileSystemUri({
      name: operation.photosItem.name,
      format: operation.photosItem.format,
      itemType: operation.photosItem.type,
      uri: operation.photosItem.localUri,
      destination: photosUtils.getPhotoPath({
        name: operation.photosItem.name,
        type: operation.photosItem.format,
        size: PhotoSizeType.Full,
      }),
    });

    const hashStart = Date.now();
    const hash = (
      await photosUtils.getPhotoHash(credentials.user.userId, name, photoData.takenAt, localUriToPath)
    ).toString('hex');

    this.log(`Hash for photo generated in ${Date.now() - hashStart}ms`);

    // 2. Make sure in the meantime, the photo was not pulled from the server, avoid network hits
    const syncedPhoto = await photosRealmDB.getSyncedPhotoByHash(hash);
    if (syncedPhoto) {
      this.log('Photo matched by hash, skipping upload');
      return syncedPhoto;
    }
    const startAt = Date.now();

    this.log(`--- UPLOADING ${name} ---`);

    // Check for abort signal
    stopIfAborted();

    // 3. Upload the preview
    const preview = await photosPreview.generate({
      ...photoData,
      localUri: localUriToPath,
    });
    const previewGeneratedElapsed = Date.now() - startAt;
    this.log(`Preview generated in ${previewGeneratedElapsed / 1000}s`);

    // Check for abort signal
    stopIfAborted();
    const previewId = await photosNetwork.uploadPreview(preview.path);

    const uploadGeneratedElapsed = Date.now() - (previewGeneratedElapsed + startAt);
    this.log(`Preview uploaded in ${uploadGeneratedElapsed / 1000}s`);

    // Check for abort signal
    stopIfAborted();
    // 4. Upload the photo
    const photo = await photosNetwork.upload(
      localUriToPath,
      {
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
        duration: photoData.duration,
        itemType: photoData.type,
        size: (await fileSystemService.statRNFS(localUriToPath)).size,
      },
      (progress) => this.onUploadProgressCallback(photoData, progress),
    );
    const photoUploadedElapsed = Date.now() - (uploadGeneratedElapsed + previewGeneratedElapsed + startAt);
    this.log(`Photo uploaded successfully in ${photoUploadedElapsed / 1000}s`);
    /**
     * On iOS, the camera roll assets needs to be copied
     * from another location so here we remove the copy
     */
    if (Platform.OS === 'ios') {
      await fileSystemService.unlinkIfExists(localUriToPath);
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
    return this.queue.length() + this.queue.running();
  }

  private get isAborted() {
    return this.abortController.signal.aborted;
  }

  private log(message: string) {
    if (this.options.enableLog) {
      this.logger.info(message);
    }
  }
}
