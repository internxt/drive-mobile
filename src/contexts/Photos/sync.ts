import {
  PhotosEventKey,
  PhotosItem,
  PhotosRemoteSyncManagerStatus,
  PhotosSyncManagerStatus,
  PhotosSyncStatus,
} from '@internxt-mobile/types/photos';
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
  onRemotePhotosSynced: (photosItemSynced: PhotosItem[]) => void;
  onPhotosItemSynced: (photosItem: PhotosItem) => void;
  onPhotosItemUploadStart: (photosItem: PhotosItem) => void;
  onPhotosItemUploadProgress: (photosItem: PhotosItem, progress: number) => void;
}

export const startSync = async (handlers: SyncHandlers) => {
  if (!ENABLE_PHOTOS_SYNC) {
    // eslint-disable-next-line no-console
    console.warn('Photos sync is disabled, will not sync photos');
    return;
  }

  const localSyncManager = photos.localSync;
  const remoteSyncManager = photos.remoteSync;
  let pendingPhotosInterval: NodeJS.Timeout | null = null;

  localSyncManager.onPhotosItemUploadStart(handlers.onPhotosItemUploadStart);
  localSyncManager.onPhotosItemUploadProgress(handlers.onPhotosItemUploadProgress);

  const startPendingPhotosUpdatePolling = () => {
    pendingPhotosInterval = setInterval(function () {
      handlers.updatePendingTasks(localSyncManager.getPhotosThatNeedsSyncCount());
    }, 500);
  };

  const stopPendingPhotosUpdatePolling = () => {
    if (pendingPhotosInterval) {
      clearInterval(pendingPhotosInterval);
      pendingPhotosInterval = null;
    }
  };

  localSyncManager.onTotalPhotosInDeviceCalculated((photosInDevice) => {
    photos.analytics.track(PhotosAnalyticsEventKey.BackupStarted, {
      number_of_items: photosInDevice,
    });

    handlers.updateTotalTasks(photosInDevice);
  });

  remoteSyncManager.onStatusChange((status) => {
    if (status === PhotosRemoteSyncManagerStatus.SYNCING) {
      handlers.updateStatus(PhotosSyncStatus.PullingRemotePhotos);
    }
    if (status === PhotosRemoteSyncManagerStatus.SYNCED) {
      // Start the local sync
      localSyncManager.run();
    }
  });

  remoteSyncManager.onRemotePhotosPageSynced((photos) => {
    handlers.onRemotePhotosSynced(photos.map((photo) => photosUtils.getPhotosItem(photo)));
  });

  // Called once we have enough photos pulled to start the local sync
  //remoteSyncManager.onRemotePhotosPulledTresholdReached(() => {});
  localSyncManager.onStatusChange((status) => {
    handlers.updatePendingTasks(localSyncManager.getPhotosThatNeedsSyncCount());
    handlers.updateCompletedTasks(localSyncManager.totalPhotosSynced);
    if (status === PhotosSyncManagerStatus.PULLING_REMOTE_PHOTOS) {
      handlers.updateStatus(PhotosSyncStatus.PullingRemotePhotos);
    }
    if (status === PhotosSyncManagerStatus.RUNNING) {
      activateKeepAwake('PHOTOS_SYNC');
      handlers.updateStatus(PhotosSyncStatus.InProgress);
    }
    if (status === PhotosSyncManagerStatus.COMPLETED) {
      stopPendingPhotosUpdatePolling();
      deactivateKeepAwake('PHOTOS_SYNC');
      handlers.updateStatus(PhotosSyncStatus.Completed);
      if (localSyncManager.totalPhotosSynced > 0) {
        photos.analytics.track(PhotosAnalyticsEventKey.BackupCompleted, {
          number_of_items: localSyncManager.totalPhotosSynced,
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
        items_left_to_backup: localSyncManager.getPhotosThatNeedsSyncCount(),
      });

      photos.analytics.track(PhotosAnalyticsEventKey.BackupStopped, {
        number_of_items_uploaded: localSyncManager.totalPhotosSynced,
        number_of_items: localSyncManager.totalPhotosInDevice,
      });
    }
  });

  localSyncManager.onPhotoSyncCompleted(async (err, photosItem) => {
    if (err) {
      handlers.updateCompletedTasks(localSyncManager.totalPhotosSynced);
      handlers.updateFailedTasks(localSyncManager.totalPhotosFailed);
      // Something bad happened tos the photo, report it to the error tracker
      errorService.reportError(err, {
        tags: {
          photos_step: 'PHOTO_SYNC_COMPLETED',
        },
      });
    }

    if (!err && photosItem) {
      handlers.onPhotosItemSynced(photosItem);
    }
    handlers.updateCompletedTasks(localSyncManager.totalPhotosSynced);
    handlers.updatePendingTasks(localSyncManager.getPhotosThatNeedsSyncCount());
  });

  photos.events.addListener({
    event: PhotosEventKey.PauseSync,
    listener: () => {
      localSyncManager.pause();
      handlers.updateStatus(PhotosSyncStatus.Paused);
    },
  });

  photos.events.addListener({
    event: PhotosEventKey.ResumeSync,
    listener: () => {
      localSyncManager.resume();
      handlers.updateStatus(PhotosSyncStatus.InProgress);
      photos.analytics.track(PhotosAnalyticsEventKey.BackupResumed, {
        items_left_to_backup: localSyncManager.getPhotosThatNeedsSyncCount(),
      });
    },
  });
  remoteSyncManager.run();
  startPendingPhotosUpdatePolling();
};
