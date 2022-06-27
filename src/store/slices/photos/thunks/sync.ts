import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice, PhotosState } from '..';
import { RootState } from '../../..';
import { PhotosService } from '../../../../services/photos';

import { PhotosEventKey, PhotosSyncManagerStatus, PhotosSyncStatus } from '../../../../types/photos';

import { PhotosCommonServices } from '../../../../services/photos/PhotosCommonService';
import { PhotosSyncManager } from '../../../../services/photos/sync/PhotosSyncManager';
import PhotosLocalDatabaseService from '../../../../services/photos/PhotosLocalDatabaseService';
import { PhotosNetworkManager } from '../../../../services/photos/network/PhotosNetworkManager';
import { PHOTOS_PER_GROUP } from '../../../../services/photos/constants';

const startSyncThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startSync',
  async (_, { dispatch, getState }) => {
    const { syncStatus } = getState().photos;
    if (syncStatus.status !== PhotosSyncStatus.Unknown) return;
    const photosDb = new PhotosLocalDatabaseService();
    const photosNetwork = new PhotosNetworkManager();
    await photosDb.initialize();
    const syncManager = new PhotosSyncManager({ checkIfExistsPhotosAmount: PHOTOS_PER_GROUP }, photosDb, photosNetwork);

    syncManager.onTotalPhotosInDeviceCalculated((photosInDevice) => {
      dispatch(
        photosSlice.actions.updateSyncStatus({
          totalTasks: photosInDevice,
        }),
      );
    });

    syncManager.onPhotoSyncCompleted((err, photo) => {
      if (photo) {
        dispatch(photosSlice.actions.insertUploadedPhoto(photo));
      }
      if (!err) {
        const { syncStatus } = getState().photos;
        dispatch(
          photosSlice.actions.updateSyncStatus({
            completedTasks: syncStatus.completedTasks + 1,
          }),
        );
      }
    });

    syncManager.onStatusChange((status) => {
      if (status === PhotosSyncManagerStatus.PAUSED) {
        dispatch(
          photosSlice.actions.updateSyncStatus({
            status: PhotosSyncStatus.Paused,
          }),
        );
      }

      if (status === PhotosSyncManagerStatus.RUNNING) {
        dispatch(
          photosSlice.actions.updateSyncStatus({
            status: PhotosSyncStatus.InProgress,
          }),
        );
      }
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.PauseSync,
      listener: () => {
        syncManager.pause();
      },
    });

    // We want to resume the sync, it must be paused first
    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.ResumeSync,
      listener: () => {
        syncManager.run();
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.RestartSync,
      listener: () => {
        syncManager.restart();
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.ClearSync,
      listener: () => {
        syncManager.destroy();
      },
    });

    syncManager.run();
  },
);

const pauseSyncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/pauseSync', () => {
  PhotosService.instance.pauseSync();
});

const resumeSyncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/resumeSync', () => {
  PhotosCommonServices.events.emit({
    event: PhotosEventKey.ResumeSync,
  });
});
export const syncExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>) => {
  /*  builder
    .addCase(syncThunk.pending, (state, action) => {
      state.syncRequests.push(action.meta.requestId);
    })
    .addCase(syncThunk.fulfilled, (state, action) => {
      const index = state.syncRequests.indexOf(action.meta.requestId);
      state.syncRequests.splice(index, 1);
      Object.assign(state.syncStatus, { status: PhotosSyncStatus.Completed });
    })
    .addCase(syncThunk.rejected, (state, action) => {
      const index = state.syncRequests.indexOf(action.meta.requestId);
      state.syncRequests.splice(index, 1);

      if (!action.meta.aborted) {
        Object.assign(state.syncStatus, { status: PhotosSyncStatus.Pending });
        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.formatString(
            strings.errors.photosSync,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      }
    }); */
};

export const syncThunks = {
  startSyncThunk,
  pauseSyncThunk,
  resumeSyncThunk,
};
