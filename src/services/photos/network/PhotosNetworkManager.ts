import {
  DevicePhoto,
  DevicePhotoRemoteCheck,
  PhotosNetworkManagerStatus,
  PhotosNetworkOperation,
} from '../../../types/photos';

import async from 'async';
import { Photo, PhotoExistsData } from '@internxt/sdk/dist/photos';
import { RunnableService } from '../../../helpers/services';
import fileSystemService from '../../FileSystemService';
import { PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY } from '../constants';
import { SdkManager } from '@internxt-mobile/services/common';
import { AbortedOperationError } from 'src/types';
import { Platform } from 'react-native';
import photos from '..';
import { photosNetwork } from './photosNetwork.service';
import AuthService from '@internxt-mobile/services/AuthService';
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

  private logger = photos.logger;
  // eslint-disable-next-line
  private onStatusChangeCallback: OnStatusChangeCallback = () => {};
  private sdk: SdkManager;
  private options: { enableLog: boolean };
  private queue = async.queue<PhotosNetworkOperation, Photo | null, Error>((task, next) => {
    if (this.isAborted) {
      throw new AbortedOperationError();
    }

    this.processUploadOperation(task)
      .then((result) => {
        next(null, result);
      })
      .catch((err) => {
        next(err, null);
      });
  }, PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY);

  constructor(sdk: SdkManager, options = { enableLog: false }) {
    this.sdk = sdk;
    this.options = options;
    this.queue.drain(() => {
      this.updateStatus(PhotosNetworkManagerStatus.EMPTY);
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

  public isDone() {
    return this.status === PhotosNetworkManagerStatus.EMPTY || this.status === PhotosNetworkManagerStatus.IDLE;
  }
  public resume() {
    this.queue.resume();
    if (!this.totalOperations) {
      this.updateStatus(PhotosNetworkManagerStatus.EMPTY);
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
   * Gets a list of photos containing the ones that exists remotely and the ones that doesn't
   *
   * @param devicePhotos A list of device photos to check if exists remotely
   * @returns The same list of photos containing an exists property and a remote photo if it exists
   */
  public async getMissingRemotely(devicePhotos: DevicePhoto[]): Promise<DevicePhotoRemoteCheck[]> {
    const { credentials } = await AuthService.getAuthCredentials();
    const convertedPhotos = [];
    for (const devicePhoto of devicePhotos) {
      const name = photos.utils.getPhotoName(devicePhoto.filename);
      const type = photos.utils.getPhotoType(devicePhoto.filename);
      const createdAt = new Date(devicePhoto.creationTime);

      const photoRef = await photos.utils.cameraRollUriToFileSystemUri(
        {
          name,
          type,
        },
        devicePhoto.uri,
      );

      convertedPhotos.push({
        devicePhoto,
        name,
        takenAt: createdAt.toISOString(),
        photoRef,
        hash: await photos.utils.getPhotoHash(credentials.user.userId, name, createdAt.getTime(), photoRef),
      });
    }

    const result = await this.sdk.photos.photos.photosExists(
      convertedPhotos.map((converted) => {
        return {
          hash: converted.hash.toString('hex'),
          takenAt: converted.takenAt,
          name: converted.name,
        };
      }),
    );

    return convertedPhotos.map((convertedPhoto, index) => {
      const serverPhoto: PhotoExistsData = result[index];

      return {
        photo: 'id' in serverPhoto ? (serverPhoto as Photo) : undefined,
        devicePhoto: convertedPhoto.devicePhoto,
        hash: convertedPhoto.hash.toString('hex'),
        photoRef: convertedPhoto.photoRef,
        exists: serverPhoto.exists,
      };
    });
  }

  /**
   * Starts and upload a given photo based on the operation data
   *
   * @param operation Operation to create the upload from
   * @returns The result of the operation
   */
  public async processUploadOperation(operation: PhotosNetworkOperation): Promise<OperationResult> {
    const { credentials } = await AuthService.getAuthCredentials();
    const photosDevice = photos.user.getDevice();
    if (!photosDevice) throw new Error('Photos device not found');
    const startAt = Date.now();

    const photoData = operation.devicePhoto;
    // 1. Get photo data
    const name = photos.utils.getPhotoName(photoData.filename);
    this.log(`--- UPLOADING ${name} ---`);

    const type = photos.utils.getPhotoType(photoData.filename);
    const stat = await fileSystemService.statRNFS(operation.photoRef);

    // 2. Upload the preview
    const preview = await photos.preview.generate(photoData);
    const previewGeneratedElapsed = Date.now() - startAt;
    this.log(`Preview generated in ${previewGeneratedElapsed / 1000}s`);

    const previewId = await photosNetwork.uploadPreview(preview.path);

    const uploadGeneratedElapsed = Date.now() - (previewGeneratedElapsed + startAt);
    this.log(`Preview uploaded in ${uploadGeneratedElapsed / 1000}s`);

    // 3. Upload the photo
    const photo = await photosNetwork.upload(operation.photoRef, {
      name,
      width: photoData.width,
      height: photoData.height,
      deviceId: photosDevice.id,
      hash: operation.hash,
      takenAt: new Date(photoData.creationTime),
      previewId,
      previews: [
        {
          width: preview.width,
          height: preview.height,
          size: preview.size,
          fileId: previewId,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          // Should fix this in the SDK, types are wrong
          type: preview.type,
        },
      ],
      type: type,
      userId: credentials.user.userId,
      size: parseInt(stat.size, 10),
    });
    const photoUploadedElapsed = Date.now() - (uploadGeneratedElapsed + previewGeneratedElapsed + startAt);
    this.log(`Photo uploaded successfully in ${photoUploadedElapsed / 1000}s`);
    /**
     * On iOS, the camera roll assets needs to be copied
     * from another location so here we remove the copy
     */
    if (Platform.OS === 'ios') {
      await fileSystemService.unlink(operation.photoRef);
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

  private get isAborted() {
    return this.status === PhotosNetworkManagerStatus.ABORTED;
  }

  private log(message: string) {
    if (this.options.enableLog) {
      this.logger.info(message);
    }
  }
}
