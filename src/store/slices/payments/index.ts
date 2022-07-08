import { CreateCheckoutSessionPayload, DisplayPrice, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import _ from 'lodash';
import { constants } from 'src/services/AppService';
import notificationsService from 'src/services/NotificationsService';
import paymentService from 'src/services/PaymentService';
import { RootState } from 'src/store';
import { NotificationType } from 'src/types';

export interface PaymentsState {
  isLoading: boolean;
  prices: DisplayPrice[];
  subscription: UserSubscription;
  sessionId: string;
}

const initialState: PaymentsState = {
  isLoading: false,
  prices: [],
  subscription: {
    type: 'free',
  },
  sessionId: '',
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'payments/initialize',
  async (payload, { getState, dispatch }) => {
    const { loggedIn, photosToken, user } = getState().auth;

    if (loggedIn && user) {
      paymentService.initialize(photosToken, user.mnemonic);
      dispatch(loadPricesThunk());
      dispatch(loadUserSubscriptionThunk());
    }
  },
);

const loadPricesThunk = createAsyncThunk<DisplayPrice[], void, { state: RootState }>(
  'payments/loadPrices',
  async () => {
    const prices = await paymentService.getPrices();

    return prices.sort((a, b) => a.bytes - b.bytes);
  },
);

const loadUserSubscriptionThunk = createAsyncThunk<UserSubscription, void, { state: RootState }>(
  'payments/loadUserSubscription',
  async () => {
    return paymentService.getUserSubscription();
  },
);

const createSessionThunk = createAsyncThunk<void, string, { state: RootState }>(
  'payments/createSession',
  async (priceId, { getState }) => {
    const { user } = getState().auth;
    const redirectUrl = `${constants.REACT_NATIVE_WEB_CLIENT_URL}/redirect-to-app?path=checkout`;
    const payload: CreateCheckoutSessionPayload = {
      price_id: priceId,
      customer_email: user?.email as string,
      success_url: redirectUrl,
      cancel_url: redirectUrl,
    };
    const response = await paymentService.createCheckoutSession(payload);

    paymentService.redirectToCheckout(response.sessionId);
  },
);

export const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadPricesThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadPricesThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.prices = action.payload;
      })
      .addCase(loadPricesThunk.rejected, (state) => {
        state.isLoading = false;
        notificationsService.show({ type: NotificationType.Error, text1: strings.errors.loadPrices });
      });

    builder.addCase(loadUserSubscriptionThunk.fulfilled, (state, action) => {
      state.subscription = action.payload;
    });
  },
});

export const paymentsActions = paymentsSlice.actions;

export const paymentsSelectors = {
  pricesBySize: (state: RootState) => _.groupBy(state.payments.prices, 'bytes'),
};

export const paymentsThunks = {
  initializeThunk,
  loadPricesThunk,
  loadUserSubscriptionThunk,
  createSessionThunk,
};

export default paymentsSlice.reducer;
