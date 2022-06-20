import { Photo } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice } from '..';
import { RootState } from '../../..';
import { PhotosService } from '../../../../services/photos';
import { PhotosCommonServices } from '../../../../services/photos/PhotosCommonService';
import { PhotoFileSystemRef, PhotoSizeType } from '../../../../types/photos';

const downloadFullSizePhotoThunk = createAsyncThunk<
  PhotoFileSystemRef,
  { photo: Photo; onProgressUpdate: (progress: number) => void },
  { state: RootState }
>('photos/downloadFullSize', async ({ photo, onProgressUpdate }) => {
  return PhotosService.instance.downloadPhoto(
    { photoFileId: photo.fileId },
    {
      destination: PhotosCommonServices.getPhotoPath({
        name: photo.name,
        size: PhotoSizeType.Full,
      }),
      decryptionProgressCallback: () => undefined,
      downloadProgressCallback: onProgressUpdate,
    },
  );
});

const deletePhotosThunk = createAsyncThunk<void, { photos: Photo[] }, { state: RootState }>(
  'photos/downloadFullSize',
  async ({ photos }, { dispatch }) => {
    await PhotosService.instance.deletePhotos(photos);
    dispatch(photosSlice.actions.removePhotos(photos));
  },
);
export const networkThunks = {
  downloadFullSizePhotoThunk,
  deletePhotosThunk,
};
