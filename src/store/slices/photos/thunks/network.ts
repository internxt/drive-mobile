import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosThunks } from '..';
import { RootState } from '../../..';
import { PhotosItemBacked } from '../../../../types/photos';

import * as photosUseCases from '@internxt-mobile/useCases/photos';

const deletePhotosThunk = createAsyncThunk<void, { photosToDelete: PhotosItemBacked[] }, { state: RootState }>(
  'photos/deletePhotos',
  async ({ photosToDelete }, { dispatch }) => {
    dispatch(photosThunks.removePhotosThunk({ photosToRemove: photosToDelete }));
    await photosUseCases.deletePhotosItems({ photosToDelete });
  },
);
export const networkThunks = {
  deletePhotosThunk,
};
