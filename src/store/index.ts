import { configureStore } from '@reduxjs/toolkit';

import appReducer from './slices/app';
import authReducer from './slices/auth';
import storageReducer from './slices/storage';
import layoutReducer from './slices/layout';
import photosReducer from './slices/photos';
import paymentsReducer from './slices/payments';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    storage: storageReducer,
    layout: layoutReducer,
    photos: photosReducer,
    payments: paymentsReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
