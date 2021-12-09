import CameraRoll from '@react-native-community/cameraroll';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { loadLocalPhotos } from '../../../services/photos';
import { GalleryViewMode } from '../../../types';

export interface PhotosState {
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  photos: CameraRoll.PhotoIdentifier[];
  nextCursor?: string;
  selectedPhotos: CameraRoll.PhotoIdentifier[];
}

const initialState: PhotosState = {
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.All,
  photos: [],
  nextCursor: undefined,
  selectedPhotos: [],
};

const loadLocalPhotosThunk = createAsyncThunk<
  { loadedPhotos: CameraRoll.PhotoIdentifier[]; nextCursor: string | undefined },
  { cursor?: string },
  { state: RootState }
>('photos/loadLocalPhotos', async ({ cursor }) => {
  const [loadedPhotos, nextCursor] = await loadLocalPhotos(cursor);

  return { loadedPhotos, nextCursor };
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
    selectPhoto(state, action: PayloadAction<CameraRoll.PhotoIdentifier>) {
      state.selectedPhotos = [...state.selectedPhotos, action.payload];
    },
    deselectPhoto(state, action: PayloadAction<CameraRoll.PhotoIdentifier>) {
      const itemIndex = state.selectedPhotos.findIndex((i) => i.node.image.uri === action.payload.node.image.filename);

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
    (photo: CameraRoll.PhotoIdentifier): boolean =>
      state.photos.selectedPhotos.some((i) => i.node.image.uri === photo.node.image.uri),
};

export const photosThunks = {
  loadLocalPhotosThunk,
};

export default photosSlice.reducer;
