import { Photo } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice } from '..';
import { RootState } from '../../..';
import { PhotoFileSystemRef, PhotoSizeType } from '../../../../types/photos';
import photos from '@internxt-mobile/services/photos';
const downloadFullSizePhotoThunk = createAsyncThunk<
  PhotoFileSystemRef,
  { photo: Photo; onProgressUpdate: (progress: number) => void },
  { state: RootState }
>('photos/downloadFullSize', async ({ photo, onProgressUpdate }) => {
  return photos.network.download(photo.fileId, {
    destination: photos.utils.getPhotoPath({
      name: photo.name,
      size: PhotoSizeType.Full,
      type: photo.type,
    }),
    decryptionProgressCallback: () => undefined,
    downloadProgressCallback: onProgressUpdate,
  });
});

const deletePhotosThunk = createAsyncThunk<void, { photosToDelete: Photo[] }, { state: RootState }>(
  'photos/deletePhotos',
  async ({ photosToDelete }, { dispatch }) => {
    await photos.network.deletePhotos(photosToDelete);
    dispatch(photosSlice.actions.removePhotos(photosToDelete));
  },
);
export const networkThunks = {
  downloadFullSizePhotoThunk,
  deletePhotosThunk,
};
