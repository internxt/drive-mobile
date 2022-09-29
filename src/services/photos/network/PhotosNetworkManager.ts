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

    this.processUploadOperation(task)
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
   * Gets a list of photos containing the ones that exists remotely and the ones that doesn't
   *
   * @param devicePhotos A list of device photos to check if exists remotely
   * @returns The same list of photos containing an exists property and a remote photo if it exists
   */
  public async getMissingRemotely(devicePhotos: DevicePhoto[]): Promise<DevicePhotoRemoteCheck[]> {
    const { credentials } = await AuthService.getAuthCredentials();
    const convertedPhotos = [];
    for (const devicePhoto of devicePhotos) {
      const name = photosUtils.getPhotoName(devicePhoto.filename);
      const type = photosUtils.getPhotoType(devicePhoto.filename);
      const createdAt = new Date(devicePhoto.creationTime);

      const photoRef = await photosUtils.cameraRollUriToFileSystemUri(
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
        hash: await photosUtils.getPhotoHash(credentials.user.userId, name, createdAt.getTime(), photoRef),
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
  public async processUploadOperation(operation: PhotosNetworkOperation): Promise<OperationResult | null> {
    const { credentials } = await AuthService.getAuthCredentials();
    const device = photosUser.getDevice();
    const user = photosUser.getUser();
    if (!device) throw new Error('Photos device not found');
    if (!user) throw new Error('Photos user not found');
    if (!operation.photosItem.localUri) throw new Error('Local uri not found');
    const startAt = Date.now();
    operation.photosItem.localUri = await photosUtils.cameraRollUriToFileSystemUri(
      {
        name: operation.photosItem.name,
        type: operation.photosItem.format,
      },
      operation.photosItem.localUri,
    );
    const photoData = operation.photosItem;
    // 1. Get photo data
    const name = photoData.name;
    this.log(`--- UPLOADING ${name} ---`);
    // 2. Upload the preview
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

    const hash = (
      await photosUtils.getPhotoHash(credentials.user.userId, name, photoData.takenAt, operation.photosItem.localUri)
    ).toString('hex');

    this.log('Hash for photo generated');
    // 3. Upload the photo
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          // Should fix this in the SDK, types are wrong
          type: preview.type,
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

  private get isAborted() {
    return this.status === PhotosNetworkManagerStatus.ABORTED;
  }

  private log(message: string) {
    if (this.options.enableLog) {
      this.logger.info(message);
    }
  }
}
