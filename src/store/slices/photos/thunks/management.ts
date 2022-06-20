import { Photo } from '@internxt/sdk/dist/photos';
import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { PhotosState } from '..';
import { RootState } from '../../..';
import strings from '../../../../../assets/lang/strings';
import notificationsService from '../../../../services/NotificationsService';
import { PhotosService } from '../../../../services/photos';
import { NotificationType } from '../../../../types';

/* const deleteSelectedThunk = createAsyncThunk<void, { photos: Photo[] }, { state: RootState }>(
  'photos/deleteSelected',
  async ({ photos }, { dispatch }) => {
    for (const selectedPhoto of photos) {
      await PhotosService.instance.deletePhoto(selectedPhoto);
    }
  },
);

const selectAllThunk = createAsyncThunk<Photo[], void, { state: RootState }>('photos/selectAll', async () => {
  PhotosService.instance.getAll();
}); */

export const photosManagementExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>) => {
  /*  builder
    .addCase(selectAllThunk.pending, () => undefined)
    .addCase(selectAllThunk.fulfilled, (state, action) => {
      state.selection = action.payload;
    })
    .addCase(selectAllThunk.rejected, () => undefined);

  builder
    .addCase(deletePhotosThunk.pending, () => undefined)
    .addCase(deletePhotosThunk.fulfilled, () => undefined)
    .addCase(deletePhotosThunk.rejected, (state, action) => {
      notificationsService.show({
        type: NotificationType.Error,
        text1: strings.formatString(
          strings.errors.photosDelete,
          action.error.message || strings.errors.unknown,
        ) as string,
      });
    }); */
};
