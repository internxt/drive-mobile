import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { photosActions, photosSlice, PhotosState, photosThunks } from '..';
import { RootState } from '../../..';
import { PhotosService } from '../../../../services/photos';
import { DevicePhotosScannerService } from '../../../../services/photos/DevicePhotosScannerService';
import { DevicePhotosSyncCheckerService } from '../../../../services/photos/DevicePhotosSync.service';
import {
  PhotosEventKey,
  PhotosSyncStatus,
  SyncStage,
  DevicePhotosSyncStatus,
  DevicePhotosOperationPriority,
  DevicePhoto,
  PhotosNetworkOperationResult,
  PhotosNetworkManagerStatus,
} from '../../../../types/photos';
import * as MediaLibrary from 'expo-media-library';
import { PhotosCommonServices } from '../../../../services/photos/PhotosCommonService';
import { PhotosNetworkManager } from '../../../../services/photos/PhotosNetworkManager';
import PhotosLocalDatabaseService from '../../../../services/photos/PhotosLocalDatabaseService';

const itemGroups: MediaLibrary.Asset[][] = [];
const startSyncThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startSync',
  async (_, { dispatch, getState }) => {
    const photosLocalDatabase = new PhotosLocalDatabaseService();
    const devicePhotosScanner = new DevicePhotosScannerService();
    const photosNetworkManager = new PhotosNetworkManager();
    devicePhotosScanner.onTotalPhotosCalculated((totalPhotos) => {
      dispatch(
        photosSlice.actions.updateSyncStatus({
          totalTasks: totalPhotos,
        }),
      );
    });
    devicePhotosScanner.onGroupOfPhotosReady((group) => {
      itemGroups.push(group);
      if (devicePhotosSyncChecker.status === DevicePhotosSyncStatus.IDLE) {
        syncGroup(group);
      }
    });

    const syncGroup = (devicePhotosGroup: DevicePhoto[]) => {
      devicePhotosGroup.forEach((devicePhoto) => {
        devicePhotosSyncChecker.addOperation({
          devicePhoto,
          priority: DevicePhotosOperationPriority.NORMAL,
        });
      });
      if (devicePhotosSyncChecker.status === DevicePhotosSyncStatus.IDLE) {
        devicePhotosSyncChecker.run();
      }
    };

    const devicePhotosSyncChecker = new DevicePhotosSyncCheckerService();
    photosNetworkManager.onOperationResolved(async (operation) => {
      if (operation.result === PhotosNetworkOperationResult.SUCCESS) {
        if (operation.uploadedPhoto) {
          await photosLocalDatabase.persistPhotoSync(operation.uploadedPhoto.fileId, operation.devicePhoto.uri);
        }

        devicePhotosSyncChecker.addOperation({
          devicePhoto: operation.devicePhoto,
          priority: DevicePhotosOperationPriority.HIGH,
        });
      }
    });

    devicePhotosSyncChecker.onOperationResolved(async (operation) => {
      if (operation.syncStage === SyncStage.IN_SYNC) {
        const { syncStatus } = getState().photos;

        dispatch(
          photosSlice.actions.updateSyncStatus({
            completedTasks: syncStatus.completedTasks + 1,
          }),
        );
      }

      if (operation.syncStage === SyncStage.NEEDS_REMOTE_CHECK) {
        /**
         * Upload the photo, once the photo is uploaded
         * tell the sync checker to ensure the photo
         * is correctly synced in the SQlite table
         *
         * This operation sho`uld appear here again, but with syncStage ===  SyncStage.IN_SYNC
         */
        photosNetworkManager.addOperation(operation.devicePhoto);
        if (photosNetworkManager.status === PhotosNetworkManagerStatus.IDLE) {
          photosNetworkManager.run();
        }
      }
    });

    devicePhotosSyncChecker.onStatusChange((newStatus) => {
      if (DevicePhotosSyncStatus.EMPTY === newStatus) {
        itemGroups.shift();
        const nextGroup = itemGroups[0];
        if (nextGroup) {
          syncGroup(nextGroup);
        }
      }
      if (DevicePhotosSyncStatus.RUNNING === newStatus) {
        dispatch(
          photosSlice.actions.updateSyncStatus({
            status: PhotosSyncStatus.InProgress,
          }),
        );
      }
      if (DevicePhotosSyncStatus.PAUSED === newStatus) {
        dispatch(
          photosSlice.actions.updateSyncStatus({
            status: PhotosSyncStatus.Paused,
          }),
        );
      }
    });

    // Start checking the current sync stage of the photos we
    // are getting through the scanner
    // We want to pause the sync, it can be resumed
    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.PauseSync,
      listener: () => {
        devicePhotosScanner.pause();
        devicePhotosSyncChecker.pause();
        photosNetworkManager.pause();
      },
    });

    // We want to resume the sync, it must be paused first
    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.ResumeSync,
      listener: () => {
        devicePhotosScanner.run();
        devicePhotosSyncChecker.run();
        photosNetworkManager.run();
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.RestartSync,
      listener: () => {
        photosNetworkManager.restart();
        devicePhotosSyncChecker.restart();
        devicePhotosScanner.restart();
      },
    });

    PhotosCommonServices.events.addListener({
      event: PhotosEventKey.ClearSync,
      listener: () => {
        devicePhotosSyncChecker.destroy();
        devicePhotosScanner.destroy();
        photosNetworkManager.destroy();
      },
    });

    devicePhotosScanner.run();
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
