import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice, photosThunks } from '..';
import { RootState } from '../../..';
import photosService from '../../../../services/photos';
import { PhotosEventKey, PhotosSyncManagerStatus, PhotosSyncStatus } from '../../../../types/photos';
import { PhotosCommonServices } from '../../../../services/photos/PhotosCommonService';
import { PhotosSyncManager } from '../../../../services/photos/sync/PhotosSyncManager';
import { PhotosNetworkManager } from '../../../../services/photos/network/PhotosNetworkManager';
import { PHOTOS_PER_NETWORK_GROUP } from '../../../../services/photos/constants';
import errorService from 'src/services/ErrorService';
import { SdkManager } from 'src/services/common/SdkManager';

const startSyncThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/startSync',
  async (_, { dispatch, getState }) => {
    const { syncStatus } = getState().photos;
    if (syncStatus.status !== PhotosSyncStatus.Unknown) return;
    const photosNetwork = new PhotosNetworkManager(SdkManager.getInstance());
    const syncManager = new PhotosSyncManager(
      { checkIfExistsPhotosAmount: PHOTOS_PER_NETWORK_GROUP },
      photosService.photosLocalDatabase,
      photosNetwork,
    );

    syncManager.onTotalPhotosInDeviceCalculated((photosInDevice) => {
      PhotosCommonServices.events.emit(
        {
          event: PhotosEventKey.SyncTasksCalculated,
        },
        photosInDevice,
      );
    });

    syncManager.onPhotosCheckedRemotely(() => {
      dispatch(photosThunks.loadPhotosUsageThunk());
    });

    syncManager.onStatusChange((status) => {
      if (status === PhotosSyncManagerStatus.RUNNING) {
        PhotosCommonServices.events.emit({
          event: PhotosEventKey.RunningSync,
        });
      }
      if (status === PhotosSyncManagerStatus.COMPLETED) {
        PhotosCommonServices.events.emit({
          event: PhotosEventKey.SyncCompleted,
        });
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
      if (photo) {
        photosService.getPreview(photo).then((preview) => {
          dispatch(
            photosSlice.actions.insertUploadedPhoto({
              ...photo,
              resolvedPreview: preview,
            }),
          );
        });
      }
      if (!err && photo) {
        PhotosCommonServices.events.emit(
          {
            event: PhotosEventKey.PhotoSyncDone,
          },
          syncManager.totalPhotosSynced,
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
        syncManager.resume();
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
  photosService.pauseSync();
});

const resumeSyncThunk = createAsyncThunk<void, void, { state: RootState }>('photos/resumeSync', () => {
  PhotosCommonServices.events.emit({
    event: PhotosEventKey.ResumeSync,
  });
});

export const syncThunks = {
  startSyncThunk,
  pauseSyncThunk,
  resumeSyncThunk,
};
