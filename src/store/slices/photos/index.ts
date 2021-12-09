import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { GalleryViewMode } from '../../../types';
import { Photo } from '@internxt/sdk';

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
  photos: [],
  nextCursor: undefined,
  selectedPhotos: [],
};

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
  loadLocalPhotosThunk,
};

export default photosSlice.reducer;
