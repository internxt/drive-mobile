import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/auth';
import filesReducer from './slices/files';
import layoutReducer from './slices/layout';
import photosReducer from './slices/photos';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    files: filesReducer,
    layout: layoutReducer,
    photos: photosReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
