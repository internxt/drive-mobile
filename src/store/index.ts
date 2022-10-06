import { configureStore } from '@reduxjs/toolkit';

import appReducer from './slices/app';
import authReducer from './slices/auth';
import driveReducer from './slices/drive';
import uiReducer from './slices/ui';
import paymentsReducer from './slices/payments';
import referralsReducer from './slices/referrals';
import usersReducer from './slices/users';
import newsletterReducer from './slices/newsletter';
import storageReducer from './slices/storage';
import { rtkQueryErrorMiddleware } from './middlewares/rtkQueryErrorMiddleware';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    drive: driveReducer,
    ui: uiReducer,
    payments: paymentsReducer,
    referrals: referralsReducer,
    users: usersReducer,
    newsletter: newsletterReducer,
    storage: storageReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(rtkQueryErrorMiddleware),
});
export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
