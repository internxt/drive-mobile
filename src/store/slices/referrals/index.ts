import { UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import usersReferralsService from '../../../services/UsersReferralsService';

export interface ReferralsState {
  list: UserReferral[];
}

const initialState: ReferralsState = {
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
});

export const referralsActions = referralsSlice.actions;

export const referralsThunks = {
  fetchReferralsThunk,
};

export default referralsSlice.reducer;
