import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosActions, photosSlice } from '..';
import { RootState } from '../../..';
import { PhotosEventKey, PhotosSyncManagerStatus, PhotosSyncStatus } from '../../../../types/photos';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

import errorService from 'src/services/ErrorService';
import photos from '@internxt-mobile/services/photos';
import { ENABLE_PHOTOS_SYNC } from '@internxt-mobile/services/photos/constants';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';
const startSyncThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startSync',
  async (_, { dispatch, getState }) => {
    if (!ENABLE_PHOTOS_SYNC) {
      // eslint-disable-next-line no-console
      console.warn('Photos sync is disabled, will not sync photos');
      return;
    }
    const { syncStatus } = getState().photos;
    if (syncStatus.status !== PhotosSyncStatus.Unknown) return;
    const updateStatus = (newStatus: PhotosSyncStatus) => {
      dispatch(
        photosActions.updateSyncStatus({
          status: newStatus,
        }),
      );
    };

    const syncManager = photos.sync;

    syncManager.onTotalPhotosInDeviceCalculated((photosInDevice) => {
      photos.analytics.track(PhotosAnalyticsEventKey.BackupStarted, {
        number_of_items: photosInDevice,
      });
      dispatch(
        photosActions.updateSyncStatus({
          totalTasks: photosInDevice,
        }),
      );
    });

    syncManager.onStatusChange((status) => {
      if (status === PhotosSyncManagerStatus.RUNNING) {
        activateKeepAwake('PHOTOS_SYNC');
        updateStatus(PhotosSyncStatus.InProgress);
      }
      if (status === PhotosSyncManagerStatus.COMPLETED) {
        deactivateKeepAwake('PHOTOS_SYNC');
        updateStatus(PhotosSyncStatus.Completed);
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
        updateStatus(PhotosSyncStatus.Paused);

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
        // Something bad happened to the photo, report it to the error tracker
        errorService.reportError(err, {
          tags: {
            photos_step: 'PHOTO_SYNC_COMPLETED',
          },
        });
      }
      if (photo) {
        const previewPath = (await photos.preview.getPreview(photos.utils.getPhotosItem(photo))) as string;
        dispatch(
          photosSlice.actions.insertUploadedPhoto({
            ...photos.utils.getPhotosItem(photo),
            localPreviewPath: previewPath,
            localUri: previewPath,
          }),
        );
      }
      if (!err && photo) {
        photos.events.emit(
          {
            event: PhotosEventKey.PhotoSyncDone,
          },
          syncManager.totalPhotosSynced,
        );
      }
    });

    photos.events.addListener({
      event: PhotosEventKey.PauseSync,
      listener: () => {
        syncManager.pause();
        updateStatus(PhotosSyncStatus.Paused);
      },
    });

    photos.events.addListener({
      event: PhotosEventKey.ResumeSync,
      listener: () => {
        syncManager.resume();
        updateStatus(PhotosSyncStatus.InProgress);
        photos.analytics.track(PhotosAnalyticsEventKey.BackupResumed, {
          items_left_to_backup: syncManager.pendingItemsToSync,
        });
      },
    });

    photos.events.addListener({
      event: PhotosEventKey.ClearSync,
      listener: () => {
        syncManager.destroy();
        updateStatus(PhotosSyncStatus.Unknown);
      },
    });

    photos.events.addListener({
      event: PhotosEventKey.RestartSync,
      listener: () => {
        photos.events.emit(
          {
            event: PhotosEventKey.PhotoSyncDone,
          },
          0,
        );
        syncManager.destroy();
        updateStatus(PhotosSyncStatus.Unknown);
        syncManager.run();
      },
    });
    syncManager.run();

    updateStatus(PhotosSyncStatus.InProgress);
  },
);

const pauseSyncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/pauseSync', () => {
  photos.sync.pause();
});

const resumeSyncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/resumeSync', () => {
  photos.events.emit({
    event: PhotosEventKey.ResumeSync,
  });
});

const restartSyncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/restartSync', () => {
  photos.events.emit({
    event: PhotosEventKey.RestartSync,
  });
});

export const syncThunks = {
  startSyncThunk,
  pauseSyncThunk,
  resumeSyncThunk,
  restartSyncThunk,
};
