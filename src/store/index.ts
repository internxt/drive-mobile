import { configureStore } from '@reduxjs/toolkit';

import { rtkQueryErrorMiddleware } from './middlewares/rtkQueryErrorMiddleware';
import appReducer from './slices/app';
import authReducer from './slices/auth';
import driveReducer from './slices/drive';
import paymentsReducer from './slices/payments';
import storageReducer from './slices/storage';
import uiReducer from './slices/ui';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    drive: driveReducer,
    ui: uiReducer,
    payments: paymentsReducer,
    storage: storageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(rtkQueryErrorMiddleware),
});
export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
