import { UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';
import { deviceStorage } from '../../../services/asyncStorage';
import notificationsService from '../../../services/notifications';
import usersReferralsService from '../../../services/usersReferrals';
import { NotificationType } from '../../../types';

export interface ReferralsState {
  isReading: boolean;
  list: UserReferral[];
}

const initialState: ReferralsState = {
  isReading: false,
  list: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>('referrals/initialize', async () => {
  const accessToken = await deviceStorage.getToken();
  const user = await deviceStorage.getUser();

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

        console.error(action.error);

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
