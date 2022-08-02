import {
  CreateCheckoutSessionPayload,
  DisplayPrice,
  Invoice,
  PaymentMethod,
  UserSubscription,
} from '@internxt/sdk/dist/drive/payments/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import _ from 'lodash';
import { constants } from 'src/services/AppService';
import asyncStorageService from 'src/services/AsyncStorageService';
import authService from 'src/services/AuthService';
import notificationsService from 'src/services/NotificationsService';
import paymentService from 'src/services/PaymentService';
import { RootState } from 'src/store';
import { NotificationType } from 'src/types';

export interface PaymentsState {
  isLoading: boolean;
  prices: DisplayPrice[];
  subscription: UserSubscription;
  sessionId: string;
  invoices: Invoice[];
  defaultPaymentMethod: PaymentMethod | null;
}

const initialState: PaymentsState = {
  isLoading: false,
  prices: [],
  subscription: {
    type: 'free',
  },
  sessionId: '',
  invoices: [],
  defaultPaymentMethod: null,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'payments/initialize',
  async (payload, { dispatch }) => {
    const { credentials } = await authService.getAuthCredentials();

    if (credentials) {
      dispatch(loadPricesThunk());
      dispatch(loadUserSubscriptionThunk());
      dispatch(loadInvoicesThunk());
      /* dispatch(loadDefaultPaymentMethodThunk()); */
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

const loadInvoicesThunk = createAsyncThunk<Invoice[], void, { state: RootState }>('payments/loadInvoices', async () => {
  return paymentService.getInvoices();
});

const loadDefaultPaymentMethodThunk = createAsyncThunk<PaymentMethod, void, { state: RootState }>(
  'payments/loadDefaultPaymentMethod',
  async () => {
    return paymentService.getDefaultPaymentMethod();
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

const cancelSubscriptionThunk = createAsyncThunk<void, void, { state: RootState }>(
  'payments/cancelSubscription',
  async () => {
    return paymentService.cancelSubscription();
  },
);

export const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
    },
    setSubscriptionAsFree: (state) => {
      state.subscription = { type: 'free' };
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

    builder.addCase(loadInvoicesThunk.fulfilled, (state, action) => {
      state.invoices = action.payload;
    });

    builder.addCase(loadDefaultPaymentMethodThunk.fulfilled, (state, action) => {
      state.defaultPaymentMethod = action.payload;
    });

    builder.addCase(cancelSubscriptionThunk.rejected, () => {
      notificationsService.show({ type: NotificationType.Error, text1: strings.errors.cancelSubscription });
    });
  },
});

export const paymentsActions = paymentsSlice.actions;

export const paymentsSelectors = {
  pricesBySize: (state: RootState) => _.groupBy(state.payments.prices, 'bytes'),
  hasPaidPlan: (state: RootState) => state.payments.subscription.type !== 'free',
  hasSubscription: (state: RootState) => state.payments.subscription.type === 'subscription',
  hasLifetime: (state: RootState) => state.payments.subscription.type === 'lifetime',
};

export const paymentsThunks = {
  initializeThunk,
  loadPricesThunk,
  loadUserSubscriptionThunk,
  loadInvoicesThunk,
  createSessionThunk,
  cancelSubscriptionThunk,
};

export default paymentsSlice.reducer;
