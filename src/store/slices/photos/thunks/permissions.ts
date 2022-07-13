import { createAsyncThunk } from '@reduxjs/toolkit';

import * as MediaLibrary from 'expo-media-library';
import { photosSlice } from '..';
import { RootState } from '../../..';

const checkPermissionsThunk = createAsyncThunk<{ hasPermissions: boolean }, void, { state: RootState }>(
  'photos/checkPermissions',
  async (payload: void, { dispatch }) => {
    const permissions = await MediaLibrary.getPermissionsAsync();

    const permissionsGranted = permissions.status === MediaLibrary.PermissionStatus.GRANTED;

    dispatch(photosSlice.actions.setPermissionsStatus(permissions.status));
    return {
      hasPermissions: permissionsGranted,
    };
  },
);

const askForPermissionsThunk = createAsyncThunk<boolean, void, { state: RootState }>(
  'photos/askForPermissions',
  async () => {
    const response = await MediaLibrary.requestPermissionsAsync();
    return response.granted;
  },
);

export const permissionsThunks = {
  askForPermissionsThunk,
  checkPermissionsThunk,
};
