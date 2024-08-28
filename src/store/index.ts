import { configureStore } from '@reduxjs/toolkit';

import appReducer from './slices/app';
import authReducer from './slices/auth';
import driveReducer from './slices/drive';
import uiReducer from './slices/ui';
import paymentsReducer from './slices/payments';
import usersReducer from './slices/users';
import storageReducer from './slices/storage';
import { rtkQueryErrorMiddleware } from './middlewares/rtkQueryErrorMiddleware';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    drive: driveReducer,
    ui: uiReducer,
    payments: paymentsReducer,
    users: usersReducer,
    storage: storageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(rtkQueryErrorMiddleware),
});
export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
