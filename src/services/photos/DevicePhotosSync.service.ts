import { throttle } from 'lodash';
import { RunnableService } from '../../helpers/services';
import {
  DevicePhoto,
  DevicePhotosOperationPriority,
  DevicePhotosSyncServiceHandlers,
  DevicePhotosSyncStatus,
  DevicePhotoSyncCheckOperation,
  PhotoFileSystemRef,
  SyncStage,
} from '../../types/photos';
import { PhotosCommonServices } from './PhotosCommonService';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';

/**
 *
 */
export class DevicePhotosSyncCheckerService implements RunnableService<DevicePhotosSyncStatus> {
  public status = DevicePhotosSyncStatus.IDLE;
  private queue: DevicePhotoSyncCheckOperation[] = [];
  private onOperationResolvedCallback: DevicePhotosSyncServiceHandlers['onOperationCompleted'] = () => undefined;
  private onStatusChangeCallback: DevicePhotosSyncServiceHandlers['onSyncQueueStatusChange'] = () => undefined;
  private db: PhotosLocalDatabaseService;
  constructor() {
    this.db = new PhotosLocalDatabaseService();
    this.db.initialize();
  }

  /**
   * Given a photo location, check if the photo is synced based on the SQlite data
   *
   * @param photoRef a PhotoFileSystemRef pointing to the file system photo location
   */
  public addOperation({
    devicePhoto,
    priority,
  }: {
    devicePhoto: DevicePhoto;
    priority?: DevicePhotosOperationPriority;
  }) {
    const newOperation = {
      devicePhoto,
      createdAt: new Date(),
      syncStage: SyncStage.UNKNOWN,
      priority: priority || DevicePhotosOperationPriority.NORMAL,
    };

    if (newOperation.priority === DevicePhotosOperationPriority.HIGH) {
      this.queue.splice(Math.floor(this.queue.length / 2), 0, newOperation);
    } else {
      this.queue.push(newOperation);
    }

    if (this.isPaused) return;
    this.run();
  }

  /**
   * Start or resumes the sync queue, resolves all the operations in
   * the queue
   */
  public run() {
    if (this.status === DevicePhotosSyncStatus.RUNNING) return;

    if (!this.queue.length) {
      PhotosCommonServices.log.info('Sync queue is empty, cannot run without operations');
      this.updateStatus(DevicePhotosSyncStatus.EMPTY);
      this.updateStatus(DevicePhotosSyncStatus.IDLE);

      return;
    }

    this.updateStatus(DevicePhotosSyncStatus.RUNNING);

    const nextOperation = this.getNextOperation();
    if (nextOperation) {
      this.resolveSyncQueueOperation(nextOperation);
    }
  }

  public pause() {
    this.updateStatus(DevicePhotosSyncStatus.PAUSED);
  }

  public destroy() {
    this.pause();
    this.queue = [];
    this.updateStatus(DevicePhotosSyncStatus.IDLE);
  }

  public restart() {
    this.destroy();
    this.run();
  }

  public updateStatus(status: DevicePhotosSyncStatus) {
    this.status = status;
    this.onStatusChangeCallback(status);
  }

  public onOperationResolved(callback: DevicePhotosSyncServiceHandlers['onOperationCompleted']) {
    this.onOperationResolvedCallback = callback;
  }

  public onStatusChange(callback: DevicePhotosSyncServiceHandlers['onSyncQueueStatusChange']) {
    this.onStatusChangeCallback = callback;

    this.onStatusChangeCallback(this.status);
  }

  private getNextOperation() {
    return this.queue[0];
  }

  private async getSyncStage(operation: DevicePhotoSyncCheckOperation) {
    if (operation.lastError) {
      return SyncStage.FAILED_TO_CHECK;
    }
    const dbPhoto = await this.db.getByPhotoRef(operation.devicePhoto.uri);

    if (!dbPhoto || (dbPhoto && !dbPhoto.photo_id)) {
      return SyncStage.NEEDS_REMOTE_CHECK;
    }

    if (dbPhoto.photo_id && dbPhoto.photo_ref) {
      return SyncStage.IN_SYNC;
    }

    // The fuck happened to the photo????
    return SyncStage.UNKNOWN;
  }

  private get isPaused() {
    return DevicePhotosSyncStatus.PAUSED === this.status;
  }

  private async resolveSyncQueueOperation(operation: DevicePhotoSyncCheckOperation) {
    try {
      operation.lastTry = new Date();
      operation.syncStage = await this.getSyncStage(operation);

      this.onOperationResolvedCallback(operation);

      this.queue.shift();
    } catch (e) {
      /**
       * Every time an operation fail, we add it again to the
       * end of the queue, if we reach the operation and it
       * fails again, we resolve the operation with a
       * failed syncStage
       */
      if (operation.lastError) {
        this.queue.shift();
        return this.onOperationResolvedCallback(operation);
      }

      operation.lastError = e as Error;
      const newOperation = this.queue.shift();
      if (newOperation) {
        this.queue.push(newOperation);
      }
    } finally {
      const nextOperation = this.getNextOperation();
      if (nextOperation) {
        await this.resolveSyncQueueOperation(nextOperation);
      }
    }
  }
}
