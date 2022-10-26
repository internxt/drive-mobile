import { PhotosEventKey, PhotosItem, PhotosSyncManagerStatus, PhotosSyncStatus } from '@internxt-mobile/types/photos';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

import errorService from 'src/services/ErrorService';
import photos from '@internxt-mobile/services/photos';
import { ENABLE_PHOTOS_SYNC } from '@internxt-mobile/services/photos/constants';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';
import { photosUtils } from '@internxt-mobile/services/photos/utils';

export interface SyncHandlers {
  updateTotalTasks: (totalTasks: number) => void;
  updateCompletedTasks: (completedTasks: number) => void;
  updateFailedTasks: (failedTasks: number) => void;
  updatePendingTasks: (pendingTasks: number) => void;
  updateStatus: (newStatus: PhotosSyncStatus) => void;
  onRemotePhotosSynced: (photosItemSynced: PhotosItem) => void;
  onPhotosItemSynced: (photosItem: PhotosItem) => void;
}
export const startSync = async (handlers: SyncHandlers) => {
  if (!ENABLE_PHOTOS_SYNC) {
    // eslint-disable-next-line no-console
    console.warn('Photos sync is disabled, will not sync photos');
    return;
  }

  const syncManager = photos.sync;

  syncManager.onRemotePhotosSynced((photosItem) => {
    handlers.updatePendingTasks(syncManager.getPendingTasks());
    handlers.onRemotePhotosSynced(photosItem);
  });
  syncManager.onTotalPhotosInDeviceCalculated((photosInDevice) => {
    photos.analytics.track(PhotosAnalyticsEventKey.BackupStarted, {
      number_of_items: photosInDevice,
    });

    handlers.updateTotalTasks(photosInDevice);
  });

  syncManager.onStatusChange((status) => {
    if (status === PhotosSyncManagerStatus.RUNNING) {
      activateKeepAwake('PHOTOS_SYNC');
      handlers.updateStatus(PhotosSyncStatus.InProgress);
      handlers.updateCompletedTasks(syncManager.totalPhotosSynced);
    }
    if (status === PhotosSyncManagerStatus.COMPLETED) {
      deactivateKeepAwake('PHOTOS_SYNC');
      handlers.updateStatus(PhotosSyncStatus.Completed);
      if (syncManager.totalPhotosSynced > 0) {
        photos.analytics.track(PhotosAnalyticsEventKey.BackupCompleted, {
          number_of_items: syncManager.totalPhotosSynced,
        });

        photos.analytics.identify({
          photos_backed_up: true,
        });
      }
    }

    if (status === PhotosSyncManagerStatus.PAUSED) {
      deactivateKeepAwake('PHOTOS_SYNC');
      handlers.updateStatus(PhotosSyncStatus.Paused);

      photos.analytics.track(PhotosAnalyticsEventKey.BackupPaused, {
        items_left_to_backup: syncManager.pendingItemsToSync,
      });

      photos.analytics.track(PhotosAnalyticsEventKey.BackupStopped, {
        number_of_items_uploaded: syncManager.totalPhotosSynced,
        number_of_items: syncManager.totalPhotosInDevice,
      });
    }
  });

  syncManager.onPhotoSyncCompleted(async (err, photo) => {
    if (err) {
      handlers.updateCompletedTasks(syncManager.totalPhotosSynced);
      handlers.updateFailedTasks(syncManager.totalPhotosFailed);
      // Something bad happened tos the photo, report it to the error tracker
      errorService.reportError(err, {
        tags: {
          photos_step: 'PHOTO_SYNC_COMPLETED',
        },
      });
    }

    if (!err && photo) {
      handlers.updateCompletedTasks(syncManager.totalPhotosSynced);
      handlers.onPhotosItemSynced(photosUtils.getPhotosItem(photo));
    }
    handlers.updatePendingTasks(syncManager.getPendingTasks());
  });

  photos.events.addListener({
    event: PhotosEventKey.PauseSync,
    listener: () => {
      syncManager.pause();
      handlers.updateStatus(PhotosSyncStatus.Paused);
    },
  });

  photos.events.addListener({
    event: PhotosEventKey.ResumeSync,
    listener: () => {
      syncManager.resume();
      handlers.updateStatus(PhotosSyncStatus.InProgress);
      photos.analytics.track(PhotosAnalyticsEventKey.BackupResumed, {
        items_left_to_backup: syncManager.pendingItemsToSync,
      });
    },
  });

  syncManager.run();
};
