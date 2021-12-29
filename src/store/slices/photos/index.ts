import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { GalleryViewMode } from '../../../types';
import { Photo } from '../../../services/sync/types';
import sqliteService from '../../../services/sqlite';

export interface PhotosState {
  isSelectionModeActivated: boolean;
  viewMode: GalleryViewMode;
  photos: Photo[],
  selectedPhotos: Photo[];
}

const initialState: PhotosState = {
  isSelectionModeActivated: false,
  viewMode: GalleryViewMode.All,
  photos: [],
  selectedPhotos: [],
};

// TODO: Move outside here to encapsulate type of persistence from store
interface PersistenceIterator<T> {
  next(): Promise<T[]>;
}

class SQLitePhotosIterator implements PersistenceIterator<Photo> {
  private limit: number;
  private offset: number;

  constructor(limit: number, offset = 0) {
    this.limit = limit;
    this.offset = offset;
  }

  async next(): Promise<Photo[]> {
    return sqliteService.getPhotos(this.offset, this.limit).then(([{ rows }]) => {
      // TODO: Transform to Photo[]
      this.offset += this.limit;

      return rows.raw() as unknown as Photo[];
    });
  }
}

const loadLocalPhotosThunk = createAsyncThunk<
  { loadedPhotos: Photo[]; },
  { limit: number; offset?: number; },
  { state: RootState }
>('photos/loadLocalPhotos', async ({ limit, offset }, { getState }) => {
  const iterator: PersistenceIterator<Photo> = new SQLitePhotosIterator(limit, offset);
  const photos = await iterator.next();

  console.log('loadLocalPhotosThunk called-->', photos.length);

  return { loadedPhotos: photos };
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
