import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';

import notificationsService from '../../../services/NotificationsService';
import userService from '../../../services/UserService';
import { NotificationType } from '../../../types';

export interface UsersState {
  isSendingInvitation: boolean;
}

const initialState: UsersState = {
  isSendingInvitation: false,
};

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
      .addCase(inviteAFriendThunk.pending, (state) => {
        state.isSendingInvitation = true;
      })
      .addCase(inviteAFriendThunk.fulfilled, (state) => {
        state.isSendingInvitation = false;
      })
      .addCase(inviteAFriendThunk.rejected, (state, action) => {
        state.isSendingInvitation = false;

        notificationsService.show({
          type: NotificationType.Error,
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
  inviteAFriendThunk,
};

export default usersSlice.reducer;
