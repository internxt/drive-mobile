import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { GalleryViewMode } from '../../../types';
import { Device, Photo, Photos } from '@internxt/sdk';

const photosSdk = new Photos(process.env.REACT_NATIVE_PHOTOS_API_URL as string);

export interface PhotosState {
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  photos: Photo[];
  nextCursor?: string;
  selectedPhotos: Photo[];
}

const initialState: PhotosState = {
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.All,
  photos: [
    {
      id: '01',
      name: 'photo-01',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-01',
      previewId: 'previewId-01',
      deviceId: '01',
      userUuid: '01',
    },
    {
      id: '02',
      name: 'photo-02',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-02',
      previewId: 'previewId-02',
      deviceId: '02',
      userUuid: '02',
    },
    {
      id: '03',
      name: 'photo-03',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-03',
      previewId: 'previewId-03',
      deviceId: '03',
      userUuid: '03',
    },
    {
      id: '04',
      name: 'photo-04',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-04',
      previewId: 'previewId-04',
      deviceId: '04',
      userUuid: '04',
    },
    {
      id: '05',
      name: 'photo-05',
      type: 'png',
      size: 100,
      width: 100,
      heigth: 100,
      fileId: 'fileId-05',
      previewId: 'previewId-05',
      deviceId: '05',
      userUuid: '05',
    },
  ],
  nextCursor: undefined,
  selectedPhotos: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/initialize',
  async (payload: void, { getState }) => {
    photosSdk.setToken(getState().auth.token);
  },
);

const createDeviceThunk = createAsyncThunk<void, { device: Device }, { state: RootState }>(
  'photos/createDevice',
  async ({ device }) => {
    await photosSdk.createDevice(device);
  },
);

const createPhotoThunk = createAsyncThunk<void, { data: Photo }, { state: RootState }>(
  'photos/createPhoto',
  async ({ data }) => {
    // TODO: upload photo and preview

    await photosSdk.createPhoto(data);
  },
);

const deletePhotosThunk = createAsyncThunk<void, { photos: Photo[] }, { state: RootState }>(
  'photos/deletePhotos',
  async ({ photos }) => {
    for (const photo of photos) {
      await photosSdk.deletePhotoById(photo.id);
    }
  },
);

const loadLocalPhotosThunk = createAsyncThunk<
  { loadedPhotos: Photo[]; nextCursor: string | undefined },
  { cursor?: string },
  { state: RootState }
>('photos/loadLocalPhotos', async ({ cursor }, { getState }) => {
  return { loadedPhotos: getState().photos.photos, nextCursor: cursor };
});

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    setIsSelectionModeActivated(state, action: PayloadAction<boolean>) {
      state.isSelectionModeActivated = action.payload;
    },
    setViewMode(state, action: PayloadAction<GalleryViewMode>) {
      state.viewMode = action.payload;
    },
    selectPhoto(state, action: PayloadAction<Photo>) {
      state.selectedPhotos = [...state.selectedPhotos, action.payload];
    },
    deselectPhoto(state, action: PayloadAction<Photo>) {
      const itemIndex = state.selectedPhotos.findIndex((i) => i.id === action.payload.id);

      state.selectedPhotos.splice(itemIndex, 1);

      state.selectedPhotos = [...state.selectedPhotos];
    },
    selectAll(state) {
      state.selectedPhotos = [...state.photos];
    },
    deselectAll(state) {
      state.selectedPhotos = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(createDeviceThunk.pending, () => undefined)
      .addCase(createDeviceThunk.fulfilled, () => undefined)
      .addCase(createDeviceThunk.rejected, () => undefined);

    builder
      .addCase(createPhotoThunk.pending, () => undefined)
      .addCase(createPhotoThunk.fulfilled, () => undefined)
      .addCase(createPhotoThunk.rejected, () => undefined);

    builder
      .addCase(deletePhotosThunk.pending, () => undefined)
      .addCase(deletePhotosThunk.fulfilled, () => undefined)
      .addCase(deletePhotosThunk.rejected, () => undefined);

    builder
      .addCase(loadLocalPhotosThunk.pending, () => undefined)
      .addCase(loadLocalPhotosThunk.fulfilled, (state, action) => {
        state.photos = action.payload.loadedPhotos;
        state.nextCursor = action.payload.nextCursor;
      })
      .addCase(loadLocalPhotosThunk.rejected, () => undefined);
  },
});

export const photosActions = photosSlice.actions;

export const photosSelectors = {
  isPhotoSelected:
    (state: RootState) =>
    (photo: Photo): boolean =>
      state.photos.selectedPhotos.some((i) => i.id === photo.id),
};

export const photosThunks = {
  createDeviceThunk,
  createPhotoThunk,
  deletePhotosThunk,
  loadLocalPhotosThunk,
};

export default photosSlice.reducer;
