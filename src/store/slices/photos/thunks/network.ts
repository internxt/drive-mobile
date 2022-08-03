import { Photo } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice } from '..';
import { RootState } from '../../..';
import photosService from '../../../../services/photos';
import { PhotosCommonServices } from '../../../../services/photos/PhotosCommonService';
import { PhotoFileSystemRef, PhotoSizeType } from '../../../../types/photos';

const downloadFullSizePhotoThunk = createAsyncThunk<
  PhotoFileSystemRef,
  { photo: Photo; onProgressUpdate: (progress: number) => void },
  { state: RootState }
>('photos/downloadFullSize', async ({ photo, onProgressUpdate }) => {
  return photosService.downloadPhoto(
    { photoFileId: photo.fileId },
    {
      destination: PhotosCommonServices.getPhotoPath({
        name: photo.name,
        size: PhotoSizeType.Full,
        type: photo.type,
      }),
      decryptionProgressCallback: () => undefined,
      downloadProgressCallback: onProgressUpdate,
    },
  );
});

const deletePhotosThunk = createAsyncThunk<void, { photos: Photo[] }, { state: RootState }>(
  'photos/deletePhotos',
  async ({ photos }, { dispatch }) => {
    await photosService.deletePhotos(photos);
    dispatch(photosSlice.actions.removePhotos(photos));
  },
);
export const networkThunks = {
  downloadFullSizePhotoThunk,
  deletePhotosThunk,
};
