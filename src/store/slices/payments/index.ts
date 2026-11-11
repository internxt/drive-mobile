import { DisplayPrice, Invoice, PaymentMethod, UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import strings from 'assets/lang/strings';
import _ from 'lodash';
import asyncStorageService from 'src/services/AsyncStorageService';
import authService from 'src/services/AuthService';
import { logger } from 'src/services/common';
import notificationsService from 'src/services/NotificationsService';
import paymentService from 'src/services/PaymentService';
import { RootState } from 'src/store';
import { AsyncStorageKey, NotificationType } from 'src/types';

const GRANTED_FEATURE_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;

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
  mailAccess?: boolean;
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
        dispatch(loadMailAccessThunk());
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

type CachedFeatureAccess = { hasAccess?: boolean; cachedAt: number };

const getGrantedAccessCachedAt = async (accessCacheStorageKey: AsyncStorageKey): Promise<number | null> => {
  const storedAccessJson = await asyncStorageService.getItem(accessCacheStorageKey);
  if (!storedAccessJson) {
    return null;
  }

  const cachedAccess = JSON.parse(storedAccessJson) as CachedFeatureAccess;
  return cachedAccess.hasAccess === true ? cachedAccess.cachedAt : null;
};

const saveGrantedAccess = (accessCacheStorageKey: AsyncStorageKey): Promise<void> => {
  const cachedAccess: CachedFeatureAccess = { hasAccess: true, cachedAt: Date.now() };
  return asyncStorageService.saveItem(accessCacheStorageKey, JSON.stringify(cachedAccess));
};

const removeGrantedAccess = (accessCacheStorageKey: AsyncStorageKey): Promise<void> => {
  return asyncStorageService.deleteItem(accessCacheStorageKey);
};

/**
 * Returns whether the account has the feature, asking the server unless access was granted recently.
 * When the server cannot be reached, returns the last granted access, or `null` when there is none.
 *
 * @param fetchFeatureAccess - Resolves to `null` when the server cannot be reached.
 */
const resolveFeatureAccessWithCache = async (
  accessCacheStorageKey: AsyncStorageKey,
  fetchFeatureAccess: () => Promise<boolean | null>,
): Promise<boolean | null> => {
  const grantedAccessCachedAt = await getGrantedAccessCachedAt(accessCacheStorageKey);
  const wasAccessGranted = grantedAccessCachedAt !== null;
  const isGrantedAccessStillFresh =
    wasAccessGranted && Date.now() - grantedAccessCachedAt < GRANTED_FEATURE_ACCESS_CACHE_TTL_MS;

  if (isGrantedAccessStillFresh) {
    return true;
  }

  const hasAccessFromServer = await fetchFeatureAccess();
  const couldNotReachServer = hasAccessFromServer === null;

  if (couldNotReachServer) {
    const cachedAccessDescription = wasAccessGranted
      ? `granted at ${new Date(grantedAccessCachedAt).toISOString()}`
      : 'none';
    logger.info(
      `[FeatureAccess] ${accessCacheStorageKey}: server not reachable, using cached access: ${cachedAccessDescription}`,
    );
    return wasAccessGranted ? true : null;
  }

  logger.info(`[FeatureAccess] ${accessCacheStorageKey}: server answered hasAccess=${hasAccessFromServer}`);
  if (hasAccessFromServer) {
    await saveGrantedAccess(accessCacheStorageKey);
  } else {
    await removeGrantedAccess(accessCacheStorageKey);
  }

  return hasAccessFromServer;
};

const loadFileLimitsThunk = createAsyncThunk<{ photosAccess: boolean } | null, void, { state: RootState }>(
  'payments/loadFileLimits',
  async () => {
    const photosAccess = await resolveFeatureAccessWithCache(AsyncStorageKey.PhotosAccessCache, async () => {
      const limits = await paymentService.getFileLimits();
      return limits ? limits.photosAccess : null;
    });
    return photosAccess === null ? null : { photosAccess };
  },
);

const loadMailAccessThunk = createAsyncThunk<boolean | null, void, { state: RootState }>(
  'payments/loadMailAccess',
  async () => {
    return resolveFeatureAccessWithCache(AsyncStorageKey.MailAccessCache, () => paymentService.getMailAccess());
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

    builder.addCase(loadMailAccessThunk.fulfilled, (state, action) => {
      if (action.payload !== null) {
        state.mailAccess = action.payload;
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
  hasMailAccess: (state: RootState) => state.payments.mailAccess ?? false,
};

export const paymentsThunks = {
  initializeThunk,
  loadPricesThunk,
  loadUserSubscriptionThunk,
  loadInvoicesThunk,
  loadFileLimitsThunk,
  loadMailAccessThunk,
  cancelSubscriptionThunk,
  checkShouldDisplayBilling,
};

export default paymentsSlice.reducer;
