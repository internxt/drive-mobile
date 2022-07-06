import {
  DevicePhoto,
  PhotoFileSystemRef,
  PhotosNetworkManagerStatus,
  PhotosNetworkOperation,
} from '../../../types/photos';
import { PhotosCommonServices } from '../PhotosCommonService';
import PhotosPreviewService from '../PreviewService';
import PhotosUploadService from './UploadService';
import async from 'async';
import { Photo, PhotoExistsData } from '@internxt/sdk/dist/photos';
import { RunnableService } from '../../../helpers/services';
import { InteractionManager } from 'react-native';
import fileSystemService from '../../FileSystemService';
import { PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY } from '../constants';
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
  private uploadService = new PhotosUploadService();
  private previewService = new PhotosPreviewService();
  // eslint-disable-next-line
  private onStatusChangeCallback: OnStatusChangeCallback = () => {};

  private queue = async.queue<PhotosNetworkOperation, Photo | null, Error>((task, next) => {
    this.processUploadOperation(task)
      .then((result) => {
        next(null, result);
      })
      .catch((err) => {
        next(err, null);
      });
  }, PHOTOS_NETWORK_MANAGER_QUEUE_CONCURRENCY);

  constructor() {
    this.queue.drain(() => {
      this.updateStatus(PhotosNetworkManagerStatus.EMPTY);
    });
  }
  public onStatusChange(callback: OnStatusChangeCallback) {
    this.onStatusChangeCallback = callback;
  }

  public updateStatus(status: PhotosNetworkManagerStatus): void {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public run() {
    this.queue.resume();
  }

  public restart() {
    return;
  }

  public destroy() {
    this.queue.kill();
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
  public async getMissingRemotely(
    devicePhotos: DevicePhoto[],
  ): Promise<
    { devicePhoto: DevicePhoto; hash: string; photoRef: PhotoFileSystemRef; exists: boolean; photo?: Photo }[]
  > {
    const convertedPhotos = await Promise.all(
      devicePhotos.map(async (devicePhoto) => {
        if (!PhotosCommonServices.model.user) throw new Error('Photos user not initialized');
        const name = PhotosCommonServices.getPhotoName(devicePhoto.filename);
        const type = PhotosCommonServices.getPhotoType(devicePhoto.filename);
        const createdAt = new Date(devicePhoto.creationTime);

        const photoRef = await PhotosCommonServices.cameraRollUriToFileSystemUri(
          {
            name,
            type,
          },
          devicePhoto.uri,
        );
        return {
          devicePhoto,
          name,
          takenAt: createdAt.toISOString(),
          photoRef,
          hash: await PhotosCommonServices.getPhotoHash(
            PhotosCommonServices.model.user.id,
            name,
            createdAt.getTime(),
            photoRef,
          ),
        };
      }),
    );

    const result = await PhotosCommonServices.sdk.photos.photosExists(
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
    if (!PhotosCommonServices.model.device) throw new Error('Photos device not initialized');
    if (!PhotosCommonServices.model.user) throw new Error('Photos user not initialized');

    const photoData = operation.devicePhoto;
    // 1. Get photo data
    const name = PhotosCommonServices.getPhotoName(photoData.filename);
    const type = PhotosCommonServices.getPhotoType(photoData.filename);
    const stat = await fileSystemService.statRNFS(operation.photoRef);

    // 2. Upload the preview
    const preview = await this.previewService.generate(photoData);
    const previewId = await this.uploadService.uploadPreview(preview.path);

    // 3. Upload the photo
    const photo = await this.uploadService.upload(operation.photoRef, {
      name,
      width: photoData.width,
      height: photoData.height,
      deviceId: PhotosCommonServices.model.device?.id,
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
      userId: PhotosCommonServices.model.user.id,
      size: parseInt(stat.size, 10),
    });

    // 5. Finish the upload operation
    await operation.onOperationCompleted(null, photo);

    return photo;
  }

  addOperation(operation: PhotosNetworkOperation) {
    this.queue.push<OperationResult>(operation);

    this.updateStatus(PhotosNetworkManagerStatus.RUNNING);
  }
}
