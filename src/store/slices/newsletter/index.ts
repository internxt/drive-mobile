import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';
import newsletterService from '../../../services/newsletter';
import notificationsService from '../../../services/notifications';
import { NotificationType } from '../../../types';
import { referralsThunks } from '../referrals';
import { driveThunks } from '../drive';

export interface NewsletterState {
  isSubscribing: boolean;
}

const initialState: NewsletterState = {
  isSubscribing: false,
};

const subscribeThunk = createAsyncThunk<void, string, { state: RootState }>(
  'newsletter/subscribe',
  async (email, { dispatch }) => {
    await newsletterService.subscribe(email);
    dispatch(referralsThunks.fetchReferralsThunk());
    dispatch(driveThunks.getUsageAndLimitThunk());
  },
);

export const newsletterSlice = createSlice({
  name: 'newsletter',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(subscribeThunk.pending, (state) => {
        state.isSubscribing = true;
      })
      .addCase(subscribeThunk.fulfilled, (state) => {
        state.isSubscribing = false;
      })
      .addCase(subscribeThunk.rejected, (state, action) => {
        state.isSubscribing = false;

        notificationsService.show({
          type: NotificationType.Error,
          text1: strings.formatString(
            strings.errors.subscribeToNewsletter,
            action.error.message || strings.errors.unknown,
          ) as string,
        });
      });
  },
});

export const newsletterActions = newsletterSlice.actions;

export const newsletterThunks = {
  subscribeThunk,
};

export default newsletterSlice.reducer;
