import { Photo } from '@internxt/sdk/dist/photos';
import {
  DevicePhoto,
  DevicePhotosOperationPriority,
  DevicePhotosSyncServiceHandlers,
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  SyncStage,
} from '../../../types/photos';
import PhotosLocalDatabaseService from '../PhotosLocalDatabaseService';
import async from 'async';
import { PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY } from '../constants';
/**
 *
 */
export class DevicePhotosSyncCheckerService {
  public status = DevicePhotosSyncCheckerStatus.IDLE;
  private queue = async.queue<DevicePhotoSyncCheckOperation, DevicePhotoSyncCheckOperation | null, Error>(
    (task, next) => {
      this.resolveSyncQueueOperation(task)
        .then((result) => next(null, result))
        .catch((err) => next(err, null));
    },
    PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY,
  );
  private onStatusChangeCallback: DevicePhotosSyncServiceHandlers['onSyncQueueStatusChange'] = () => undefined;
  private db: PhotosLocalDatabaseService;
  constructor(db: PhotosLocalDatabaseService) {
    this.db = db;
    this.db.initialize();
    this.queue.drain(() => {
      this.updateStatus(DevicePhotosSyncCheckerStatus.EMPTY);
      this.updateStatus(DevicePhotosSyncCheckerStatus.COMPLETED);
    });
  }

  public pause() {
    this.queue.pause();
    this.updateStatus(DevicePhotosSyncCheckerStatus.PAUSED);
  }

  public resume() {
    this.queue.resume();
    if (!this.totalOperations) {
      this.updateStatus(DevicePhotosSyncCheckerStatus.EMPTY);
    } else {
      this.updateStatus(DevicePhotosSyncCheckerStatus.RUNNING);
    }
  }

  public destroy() {
    this.queue.kill();
  }

  public isDone() {
    return this.status === DevicePhotosSyncCheckerStatus.COMPLETED;
  }

  public get totalOperations() {
    return this.queue.length();
  }
  /**
   * Given a photo location, check if the photo is synced based on the SQlite data
   *
   * @param photoRef a PhotoFileSystemRef pointing to the file system photo location
   */
  public addOperation({
    id,
    devicePhoto,
    priority,
    uploadedPhoto,
    onOperationCompleted,
  }: {
    id: string;
    devicePhoto: DevicePhoto;
    uploadedPhoto?: Photo;
    priority?: DevicePhotosOperationPriority;
    onOperationCompleted: (err: Error | null, operation: DevicePhotoSyncCheckOperation | null) => void;
  }) {
    this.updateStatus(DevicePhotosSyncCheckerStatus.RUNNING);
    const newOperation = {
      id,
      devicePhoto,
      uploadedPhoto,
      createdAt: new Date(),
      syncStage: SyncStage.UNKNOWN,
      priority: priority || DevicePhotosOperationPriority.NORMAL,
    };

    this.queue.push<DevicePhotoSyncCheckOperation>(newOperation, (err, result) => {
      onOperationCompleted(err || null, result || null);
    });
  }

  public updateStatus(status: DevicePhotosSyncCheckerStatus) {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public onStatusChange(callback: DevicePhotosSyncServiceHandlers['onSyncQueueStatusChange']) {
    this.onStatusChangeCallback = callback;
  }

  public get pendingOperations() {
    return this.queue.length();
  }

  private restart() {
    this.queue.kill();
  }
  private async getSyncStage(operation: DevicePhotoSyncCheckOperation) {
    if (operation.lastError) {
      return SyncStage.FAILED_TO_CHECK;
    }

    const dbPhoto = await this.db.getByDevicePhoto(operation.devicePhoto);

    if (!dbPhoto) {
      return SyncStage.NEEDS_REMOTE_CHECK;
    }

    if (dbPhoto && dbPhoto.stage === SyncStage.IN_SYNC) {
      return SyncStage.IN_SYNC;
    }

    // The fuck happened to the photo????
    return SyncStage.UNKNOWN;
  }

  private async resolveSyncQueueOperation(operation: DevicePhotoSyncCheckOperation) {
    try {
      operation.lastTry = new Date();
      operation.syncStage = await this.getSyncStage(operation);

      return operation;
    } catch (e) {
      operation.lastError = e as Error;
      return operation;
    }
  }
}
