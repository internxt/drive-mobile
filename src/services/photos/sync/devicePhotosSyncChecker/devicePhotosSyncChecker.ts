import {
  DevicePhotosOperationPriority,
  DevicePhotosSyncServiceHandlers,
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  SyncStage,
  PhotosItem,
} from '../../../../types/photos';
import async from 'async';
import { PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY } from '../../constants';
import { PhotosLocalDB } from '../../database';

export class DevicePhotosSyncCheckerService {
  public status = DevicePhotosSyncCheckerStatus.IDLE;
  private queue = this.createQueue();
  private onStatusChangeCallback: DevicePhotosSyncServiceHandlers['onSyncQueueStatusChange'] = () => undefined;
  constructor(private database: PhotosLocalDB) {}

  public createQueue() {
    const queue = async.queue<DevicePhotoSyncCheckOperation, DevicePhotoSyncCheckOperation | null, Error>(
      (task, next) => {
        this.resolveSyncQueueOperation(task)
          .then((result) => next(null, result))
          .catch((err) => next(err, null));
      },
      PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY,
    );
    queue.drain(() => {
      this.updateStatus(DevicePhotosSyncCheckerStatus.COMPLETED);
    });

    return queue;
  }

  public pause() {
    this.queue.pause();
    this.updateStatus(DevicePhotosSyncCheckerStatus.PAUSED);
  }

  public resume() {
    this.queue.resume();
    if (!this.totalOperations) {
      this.updateStatus(DevicePhotosSyncCheckerStatus.COMPLETED);
    } else {
      this.updateStatus(DevicePhotosSyncCheckerStatus.RUNNING);
    }
  }

  public destroy() {
    this.queue.kill();
    this.queue = this.createQueue();
  }

  public get hasFinished() {
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
    photosItem,
    priority,
    onOperationCompleted,
  }: {
    photosItem: PhotosItem;

    priority?: DevicePhotosOperationPriority;
    onOperationCompleted: (err: Error | null, operation: DevicePhotoSyncCheckOperation | null) => void;
  }) {
    this.updateStatus(DevicePhotosSyncCheckerStatus.RUNNING);
    const newOperation = {
      photosItem,
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

  private async getSyncedPhoto(operation: DevicePhotoSyncCheckOperation) {
    return this.database.getSyncedPhotoByName(operation.photosItem.name);
  }

  private async resolveSyncQueueOperation(operation: DevicePhotoSyncCheckOperation) {
    try {
      operation.lastTry = new Date();
      const syncedPhoto = await this.getSyncedPhoto(operation);
      if (syncedPhoto) {
        operation.syncedPhoto = syncedPhoto.photo;
        operation.syncStage = SyncStage.IN_SYNC;
      } else {
        operation.syncStage = SyncStage.NEEDS_REMOTE_CHECK;
      }

      return operation;
    } catch (e) {
      operation.syncStage = SyncStage.FAILED_TO_CHECK;
      operation.lastError = e as Error;
      return operation;
    }
  }
}
