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
import { Photo } from '@internxt/sdk/dist/photos';
import { RunnableService } from '../../../helpers/services';
import { DevicePhotosScannerService } from '../sync/DevicePhotosScannerService';
const QUEUE_CONCURRENCY = 1;
export type OnStatusChangeCallback = (status: PhotosNetworkManagerStatus) => void;
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
        console.log('Error', err);
        next(err, null);
      });
  }, QUEUE_CONCURRENCY);

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
  public resume() {
    this.queue.resume();
  }

  public pause(): void {
    this.queue.pause();
    this.updateStatus(PhotosNetworkManagerStatus.PAUSED);
  }

  public get totalOperations() {
    return this.queue.length();
  }
  public async getMissingRemotely(
    devicePhotos: DevicePhoto[],
  ): Promise<
    { devicePhoto: DevicePhoto; hash: string; photoRef: PhotoFileSystemRef; exists: boolean; photo?: Photo }[]
  > {
    if (!PhotosCommonServices.sdk) {
      throw new Error('Photos SDK not initialized');
    }
    if (!PhotosCommonServices.model.user) {
      throw new Error('User not initialized or not found in photos model');
    }

    const convertedPhotos = [];

    for (const devicePhoto of devicePhotos) {
      const name = PhotosCommonServices.getPhotoName(devicePhoto.filename);
      const createdAt = new Date(devicePhoto.creationTime);

      const photoRef = await PhotosCommonServices.cameraRollUriToFileSystemUri(
        {
          name,
          type: 'jpg',
        },
        devicePhoto.uri,
      );
      convertedPhotos.push({
        devicePhoto,
        name: PhotosCommonServices.getPhotoName(devicePhoto.filename),
        takenAt: createdAt.toISOString(),
        photoRef,
        hash: await PhotosCommonServices.getPhotoHash(
          PhotosCommonServices.model.user!.id,
          name,
          createdAt.getTime(),
          photoRef,
        ),
      });
    }

    const result = (
      (await PhotosCommonServices.sdk.photos.exists(
        convertedPhotos.map((converted) => {
          return {
            hash: converted.hash,
            takenAt: converted.takenAt,
            name: converted.name,
          };
        }),
      )) as any
    ).photos;
    return convertedPhotos.map((convertedPhoto, index) => {
      const serverPhoto = result[index];

      return {
        photo: serverPhoto,
        devicePhoto: convertedPhoto.devicePhoto,
        hash: convertedPhoto.hash,
        photoRef: convertedPhoto.photoRef,
        exists: serverPhoto.exists,
      };
    });
  }

  public async processUploadOperation(operation: PhotosNetworkOperation) {
    const photoData = operation.devicePhoto;
    const name = PhotosCommonServices.getPhotoName(photoData.filename);
    if (!PhotosCommonServices.model.device) {
      throw new Error('Device id not initialized or not found in photos model');
    }

    if (!PhotosCommonServices.model.user) {
      throw new Error('User not initialized or not found in photos model');
    }

    const preview = await this.previewService.generate(photoData);

    const previewId = await this.uploadService.uploadPreview(preview.path);
    return this.uploadService.upload(operation.photoRef, {
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
          type: 'JPEG',
        } as any,
      ],
      type: 'JPEG',
      userId: PhotosCommonServices.model.user.id,
      size: 1,
    });
  }

  addOperation(
    operation: PhotosNetworkOperation & { onOperationCompleted: (err: Error | null, photo: Photo | null) => void },
  ) {
    this.queue.push<Photo>(operation, (err, result) => {
      operation.onOperationCompleted(err || null, result || null);
    });

    this.updateStatus(PhotosNetworkManagerStatus.RUNNING);
  }
}
