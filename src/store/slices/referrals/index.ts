import { UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';
import { asyncStorage } from '../../../services/AsyncStorageService';
import notificationsService from '../../../services/NotificationsService';
import usersReferralsService from '../../../services/UsersReferralsService';
import { AsyncStorageKey, NotificationType } from '../../../types';

export interface ReferralsState {
  isReading: boolean;
  list: UserReferral[];
}

const initialState: ReferralsState = {
  isReading: false,
  list: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>('referrals/initialize', async () => {
  const accessToken = await asyncStorage.getItem(AsyncStorageKey.Token);
  const user = await asyncStorage.getUser();

  if (user) {
    usersReferralsService.initialize(accessToken || '', user.mnemonic);
  }
});

const fetchReferralsThunk = createAsyncThunk<UserReferral[], void, { state: RootState }>(
  'referrals/fetchReferrals',
  async () => {
    return usersReferralsService.fetch();
  },
);

export const referralsSlice = createSlice({
  name: 'referrals',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(fetchReferralsThunk.pending, (state) => {
        state.isReading = true;
      })
      .addCase(fetchReferralsThunk.fulfilled, (state, action) => {
        state.isReading = false;
        state.list = action.payload;
      })
      .addCase(fetchReferralsThunk.rejected, (state, action) => {
        state.isReading = false;

        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.formatString(
            strings.errors.fetchReferrals,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });
  },
});

export const referralsActions = referralsSlice.actions;

export const referralsThunks = {
  initializeThunk,
  fetchReferralsThunk,
};

export default referralsSlice.reducer;
