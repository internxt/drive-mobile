import { UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';
import notificationsService from '../../../services/NotificationsService';
import usersReferralsService from '../../../services/UsersReferralsService';
import { NotificationType } from '../../../types';

export interface ReferralsState {
  isReading: boolean;
  list: UserReferral[];
}

const initialState: ReferralsState = {
  isReading: false,
  list: [],
};

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
  fetchReferralsThunk,
};

export default referralsSlice.reducer;
