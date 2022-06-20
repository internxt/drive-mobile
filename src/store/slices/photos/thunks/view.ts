import { Photo } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../..';
import { PhotosService } from '../../../../services/photos';
import { PhotoFileSystemRef } from '../../../../types/photos';

const getPreviewThunk = createAsyncThunk<PhotoFileSystemRef | null, { photo: Photo }, { state: RootState }>(
  'photos/getPreview',
  async ({ photo }) => {
    return PhotosService.instance.getPreview(photo);
  },
);

export const viewThunks = {
  getPreviewThunk,
};
