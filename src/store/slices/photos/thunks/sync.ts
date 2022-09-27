import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosActions, photosSlice, photosThunks } from '..';
import { RootState } from '../../..';
import { PhotosEventKey, PhotosSyncManagerStatus, PhotosSyncStatus } from '../../../../types/photos';

import errorService from 'src/services/ErrorService';
import { PhotoStatus } from '@internxt/sdk/dist/photos';
import photos from '@internxt-mobile/services/photos';
const startSyncThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startSync',
  async (_, { dispatch, getState }) => {
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
      dispatch(
        photosActions.updateSyncStatus({
          totalTasks: photosInDevice,
        }),
      );
    });

    syncManager.onPhotosCheckedRemotely(() => {
      dispatch(photosThunks.loadPhotosUsageThunk());
    });

    syncManager.onStatusChange((status) => {
      if (status === PhotosSyncManagerStatus.RUNNING) {
        updateStatus(PhotosSyncStatus.InProgress);
      }
      if (status === PhotosSyncManagerStatus.COMPLETED) {
        updateStatus(PhotosSyncStatus.Completed);
      }
    });

    syncManager.onPhotoSyncCompleted((err, photo) => {
      if (err) {
        // Something bad happened to the photo, report it to the error tracker
        errorService.reportError(err, {
          tags: {
            photos_step: 'PHOTO_SYNC_COMPLETED',
          },
        });
      }
      if (photo && photo.status === PhotoStatus.Exists) {
        photos.preview.getPreview(photo).then((preview) => {
          dispatch(
            photosSlice.actions.insertUploadedPhoto({
              ...photo,
              resolvedPreview: preview,
            }),
          );
        });
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
