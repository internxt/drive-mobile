import { DisplayPrice, Invoice, PaymentMethod, UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import _ from 'lodash';
import asyncStorageService from 'src/services/AsyncStorageService';
import authService from 'src/services/AuthService';
import notificationsService from 'src/services/NotificationsService';
import paymentService from 'src/services/PaymentService';
import { RootState } from 'src/store';
import { AsyncStorageKey, NotificationType } from 'src/types';

const PHOTOS_ACCESS_TTL_MS = 24 * 60 * 60 * 1000;

export type Paypal = {
  paypal?: {
    country: string;
    payer_email: string;
    payer_id: string;
  };
};

export type DefaultPaymentMethod = PaymentMethod & Paypal;

export interface PaymentsState {
  isLoading: boolean;
  showBilling: boolean;
  prices: DisplayPrice[];
  subscription: UserSubscription;
  sessionId: string;
  invoices: Invoice[] | null;
  defaultPaymentMethod: DefaultPaymentMethod | null;
  photosAccess?: boolean;
}

const initialState: PaymentsState = {
  isLoading: false,
  prices: [],
  showBilling: false,
  subscription: {
    type: 'free',
  },
  sessionId: '',
  invoices: [],
  defaultPaymentMethod: null,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'payments/initialize',
  async (_, { dispatch }) => {
    try {
      const { credentials } = await authService.getAuthCredentials();

      if (credentials) {
        dispatch(loadPricesThunk());
        dispatch(loadUserSubscriptionThunk());
        dispatch(loadInvoicesThunk());
        dispatch(loadDefaultPaymentMethodThunk());
        dispatch(checkShouldDisplayBilling());
        dispatch(loadFileLimitsThunk());
      }
    } catch (err) {
      // Pass
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

const loadInvoicesThunk = createAsyncThunk<Invoice[] | null, void, { state: RootState }>(
  'payments/loadInvoices',
  async () => {
    return paymentService.getInvoices();
  },
);

const loadDefaultPaymentMethodThunk = createAsyncThunk<PaymentMethod | null, void, { state: RootState }>(
  'payments/loadDefaultPaymentMethod',
  async () => {
    return paymentService.getDefaultPaymentMethod();
  },
);

const checkShouldDisplayBilling = createAsyncThunk<boolean, void, { state: RootState }>(
  'payments/checkShouldDisplayBilling',
  async () => {
    return paymentService.billingEnabled();
  },
);

const loadFileLimitsThunk = createAsyncThunk<{ photosAccess: boolean } | null, void, { state: RootState }>(
  'payments/loadFileLimits',
  async () => {
    const cached = await asyncStorageService.getItem(AsyncStorageKey.PhotosAccessCache);
    if (cached) {
      const { photosAccess, cachedAt } = JSON.parse(cached) as { photosAccess: boolean; cachedAt: number };
      if (Date.now() - cachedAt < PHOTOS_ACCESS_TTL_MS) {
        return { photosAccess };
      }
    }

    const limits = await paymentService.getFileLimits();
    if (limits) {
      await asyncStorageService.saveItem(
        AsyncStorageKey.PhotosAccessCache,
        JSON.stringify({ photosAccess: limits.photosAccess, cachedAt: Date.now() }),
      );
    }
    return limits;
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
    setPhotosAccess: (state, action: PayloadAction<boolean>) => {
      state.photosAccess = action.payload;
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

    builder.addCase(checkShouldDisplayBilling.fulfilled, (state, action) => {
      state.showBilling = action.payload;
    });

    builder.addCase(checkShouldDisplayBilling.rejected, (state) => {
      state.showBilling = false;
    });

    builder.addCase(loadFileLimitsThunk.fulfilled, (state, action) => {
      if (action.payload) {
        state.photosAccess = action.payload.photosAccess;
      }
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
  shouldShowBilling: (state: RootState) => state.payments.showBilling,
  hasPhotosAccess: (state: RootState) => state.payments.photosAccess ?? false,
};

export const paymentsThunks = {
  initializeThunk,
  loadPricesThunk,
  loadUserSubscriptionThunk,
  loadInvoicesThunk,
  loadFileLimitsThunk,
  cancelSubscriptionThunk,
  checkShouldDisplayBilling,
};

export default paymentsSlice.reducer;
