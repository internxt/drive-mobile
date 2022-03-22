import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';

import { deviceStorage } from '../../../services/asyncStorage';
import toastService from '../../../services/toast';
import userService from '../../../services/user';
import { ToastType } from '../../../types';

export interface UsersState {
  isSendingInvitation: boolean;
}

const initialState: UsersState = {
  isSendingInvitation: false,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>('users/initialize', async () => {
  const accessToken = await deviceStorage.getToken();
  const user = await deviceStorage.getUser();

  if (user) {
    userService.initialize(accessToken || '', user.mnemonic);
  }
});

const inviteAFriendThunk = createAsyncThunk<void, string, { state: RootState }>(
  'users/inviteAFriend',
  async (email) => {
    return userService.inviteAFriend(email);
  },
);

export const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(inviteAFriendThunk.pending, (state) => {
        state.isSendingInvitation = true;
      })
      .addCase(inviteAFriendThunk.fulfilled, (state) => {
        state.isSendingInvitation = false;
      })
      .addCase(inviteAFriendThunk.rejected, (state, action) => {
        state.isSendingInvitation = false;

        toastService.show({
          type: ToastType.Error,
          text1: strings.formatString(
            strings.errors.inviteAFriend,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });
  },
});

export const usersActions = usersSlice.actions;

export const usersThunks = {
  initializeThunk,
  inviteAFriendThunk,
};

export default usersSlice.reducer;
