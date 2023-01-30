import errorService from '@internxt-mobile/services/ErrorService';
import { UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  async (_, { dispatch }) => {
    try {
      const referrals = await usersReferralsService.fetch();

      dispatch(referralsSlice.actions.setReferrals(referrals));

      return referrals;
    } catch (error) {
      errorService.reportError(error);

      return [];
    }
  },
);

export const referralsSlice = createSlice({
  name: 'referrals',
  initialState,
  reducers: {
    setReferrals: (state, action: PayloadAction<UserReferral[]>) => {
      state.list = action.payload;
    },
  },
});

export const referralsActions = referralsSlice.actions;

export const referralsThunks = {
  fetchReferralsThunk,
};

export default referralsSlice.reducer;
