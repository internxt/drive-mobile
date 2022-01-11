import { configureStore } from '@reduxjs/toolkit';

import authReducer from './slices/auth';
import filesReducer from './slices/files';
import layoutReducer from './slices/layout';
import photosReducer from './slices/photos';
import paymentsReducer from './slices/payments';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    files: filesReducer,
    layout: layoutReducer,
    photos: photosReducer,
    payments: paymentsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
