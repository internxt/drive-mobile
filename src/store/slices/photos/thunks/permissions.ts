import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import {
  checkMultiple,
  Permission,
  requestMultiple,
  PermissionStatus,
  AndroidPermission,
  IOSPermission,
} from 'react-native-permissions';
import { PhotosState } from '..';
import { RootState } from '../../..';

const checkPermissionsThunk = createAsyncThunk<Record<Permission, PermissionStatus>, void, { state: RootState }>(
  'photos/checkPermissions',
  async (payload: void, { getState }) => {
    const { permissions } = getState().photos;
    const results = await checkMultiple([
      ...Object.keys(permissions[Platform.OS as 'ios' | 'android']),
    ] as Permission[]);

    return results;
  },
);

const askForPermissionsThunk = createAsyncThunk<boolean, void, { state: RootState }>(
  'photos/askForPermissions',
  async (payload: void, { dispatch, getState }) => {
    const { permissions } = getState().photos;
    const results = await requestMultiple([
      ...Object.keys(permissions[Platform.OS as 'ios' | 'android']),
    ] as Permission[]);
    const areGranted = Object.values(results).reduce((t, x) => t || x === 'granted', false);

    await dispatch(checkPermissionsThunk()).unwrap();

    return areGranted;
  },
);

export const permissionsExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>) => {
  builder
    .addCase(checkPermissionsThunk.pending, () => undefined)
    .addCase(checkPermissionsThunk.fulfilled, (state, action) => {
      Object.entries(action.payload).forEach(([key, value]) => {
        if (Platform.OS === 'android') {
          state.permissions.android[key as AndroidPermission] = value;
        } else {
          state.permissions.ios[key as IOSPermission] = value;
        }
      });
    })
    .addCase(checkPermissionsThunk.rejected, () => undefined);
};

export const permissionsThunks = {
  askForPermissionsThunk,
  checkPermissionsThunk,
};
