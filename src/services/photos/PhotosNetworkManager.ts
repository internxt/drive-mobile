import { InteractionManager } from 'react-native';
import { RunnableService } from '../../helpers/services';
import {
  DevicePhoto,
  PhotosNetworkManagerStatus,
  PhotosNetworkOperation,
  PhotosNetworkOperationResult,
} from '../../types/photos';
import { DevicePhotosScannerService } from './DevicePhotosScannerService';
import { PhotosCommonServices } from './PhotosCommonService';
import PhotosPreviewService from './PreviewService';
import PhotosUploadService from './UploadService';

export type OnOperationResolvedCallback = (operation: PhotosNetworkOperation) => void;
export type OnStatusChangeCallback = (operation: PhotosNetworkManagerStatus) => void;
export class PhotosNetworkManager extends RunnableService<PhotosNetworkManagerStatus> {
  public status = PhotosNetworkManagerStatus.IDLE;
  private queue: PhotosNetworkOperation[] = [];

  private uploadService = new PhotosUploadService();
  private previewService = new PhotosPreviewService();
  private onOperationResolvedCallback: OnOperationResolvedCallback = () => undefined;
  private onStatusChangeCallback: OnStatusChangeCallback = () => undefined;

  public addOperation(devicePhoto: DevicePhoto) {
    this.queue.push({
      devicePhoto,
      result: PhotosNetworkOperationResult.UNKNOWN,
    });

    this.run();
  }
  public run() {
    if (this.status === PhotosNetworkManagerStatus.RUNNING) return;
    const nextOperation = this.getNextOperation();

    this.status = PhotosNetworkManagerStatus.RUNNING;
    if (nextOperation) {
      this.resolveOperation(nextOperation);
    }
  }

  public pause(): void {
    this.updateStatus(PhotosNetworkManagerStatus.PAUSED);
  }

  public destroy() {
    this.pause();
    this.queue = [];
    this.updateStatus(PhotosNetworkManagerStatus.IDLE);
  }

  public restart() {
    this.destroy();
    this.run();
  }

  public updateStatus(status: PhotosNetworkManagerStatus): void {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public onOperationResolved(callback: OnOperationResolvedCallback) {
    this.onOperationResolvedCallback = callback;
  }

  public onStatusChange(callback: OnStatusChangeCallback) {
    this.onStatusChangeCallback = callback;
  }

  public get totalOperations() {
    return this.queue.length;
  }

  private getNextOperation() {
    return this.queue[0];
  }

  private async processOperationAsync(operation: PhotosNetworkOperation) {
    const photoData = await DevicePhotosScannerService.getDevicePhotoData(operation.devicePhoto);
    const photoName = PhotosCommonServices.getPhotoName(photoData.filename);

    if (!PhotosCommonServices.model.device) {
      throw new Error('Device id not initialized or not found in photos model');
    }

    if (!PhotosCommonServices.model.user) {
      throw new Error('User not initialized or not found in photos model');
    }
    const photoRef = await PhotosCommonServices.cameraRollUriToFileSystemUri(
      {
        name: photoName,
        type: 'jpg',
      },
      photoData.uri,
    );

    const preview = await this.previewService.generate(photoData);
    let previewId = null;
    try {
      previewId = await this.uploadService.uploadPreview(preview.path);
    } catch (e) {
      console.error('Error generating preview', e);
      previewId = '123';
    }

    return await this.uploadService.upload(photoRef, {
      name: photoName,
      width: photoData.width,
      height: photoData.height,
      deviceId: PhotosCommonServices.model.device?.id,
      hash: await PhotosCommonServices.getPhotoHash(
        PhotosCommonServices.model.user.id,
        photoName,
        photoData.creationTime,
        photoRef,
      ),
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

  private resolveOperation(operation: PhotosNetworkOperation) {
    InteractionManager.runAfterInteractions(async () => {
      try {
        const photoUploaded = await this.processOperationAsync(operation);

        if (photoUploaded) {
          operation.uploadedPhoto = photoUploaded;
          operation.result = PhotosNetworkOperationResult.SUCCESS;
          await this.onOperationResolvedCallback(operation);
          this.queue.shift();
        } else {
          throw new Error('Photo not uploaded successfully');
        }
      } catch (err) {
        console.error('Error resolving operation', err);
        if (operation.lastError) {
          this.queue.shift();
          operation.result = PhotosNetworkOperationResult.FAILED;
          return this.onOperationResolvedCallback(operation);
        }

        operation.lastError = err as Error;
        const newOperation = this.queue.shift();
        if (newOperation) {
          this.queue.push(newOperation);
        }
      } finally {
        const nextOperation = this.getNextOperation();
        if (nextOperation) {
          this.resolveOperation(nextOperation);
        } else {
          this.updateStatus(PhotosNetworkManagerStatus.EMPTY);
          this.updateStatus(PhotosNetworkManagerStatus.IDLE);
        }
      }
    });
  }
}
