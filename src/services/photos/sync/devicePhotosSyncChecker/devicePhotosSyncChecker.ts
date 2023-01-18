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
import { PhotosRealmDB } from '../../database';

export class DevicePhotosSyncCheckerService {
  public status = DevicePhotosSyncCheckerStatus.IDLE;
  private queue = this.createQueue();
  private started = false;
  public totalPhotosChecked = 0;
  private onStatusChangeCallback: DevicePhotosSyncServiceHandlers['onSyncQueueStatusChange'] = () => undefined;
  constructor(private database: PhotosRealmDB) {}

  public createQueue() {
    const queue = async.queue<DevicePhotoSyncCheckOperation, DevicePhotoSyncCheckOperation | null, Error>(
      (task, next) => {
        this.resolveSyncQueueOperation(task)
          .then((result) => next(null, result))
          .catch((err) => next(err, null));
      },
      PHOTOS_SYNC_CHECKER_QUEUE_CONCURRENCY,
    );

    return queue;
  }

  public run() {
    if (this.status === DevicePhotosSyncCheckerStatus.RUNNING) return;
    this.started = true;
    this.queue.drain(() => {
      if (this.started) {
        this.updateStatus(DevicePhotosSyncCheckerStatus.COMPLETED);
      }
    });
    this.updateStatus(DevicePhotosSyncCheckerStatus.RUNNING);
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
    this.totalPhotosChecked = 0;
    this.started = false;
  }

  public get hasStarted() {
    return this.started;
  }
  public get hasFinished() {
    return (
      this.started &&
      this.status === DevicePhotosSyncCheckerStatus.COMPLETED &&
      this.queue.idle() &&
      this.totalOperations === 0
    );
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
    if (!this.started) {
      this.started = true;
    }

    const newOperation = {
      photosItem,
      createdAt: new Date(),
      syncStage: SyncStage.UNKNOWN,
      priority: priority || DevicePhotosOperationPriority.NORMAL,
    };

    this.queue.push<DevicePhotoSyncCheckOperation>(newOperation, (err, result) => {
      if (!err) {
        this.totalPhotosChecked = this.totalPhotosChecked + 1;
      }
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

  private async getSyncedPhoto(operation: DevicePhotoSyncCheckOperation) {
    return this.database.getSyncedPhotoByNameAndDate(operation.photosItem.name, operation.photosItem.takenAt);
  }

  private async resolveSyncQueueOperation(operation: DevicePhotoSyncCheckOperation) {
    try {
      operation.lastTry = new Date();
      const syncedPhoto = await this.getSyncedPhoto(operation);
      if (syncedPhoto) {
        operation.syncedPhoto = syncedPhoto;
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
