import { configureStore } from '@reduxjs/toolkit';
import paymentService from 'src/services/PaymentService';
import { AppDispatch } from 'src/store';
import paymentsReducer, { paymentsSelectors, paymentsThunks } from './index';

const makeStore = (preloaded?: Parameters<typeof configureStore>[0]['preloadedState']) => {
  const store = configureStore({ reducer: { payments: paymentsReducer }, preloadedState: preloaded });
  return { ...store, dispatch: store.dispatch as unknown as AppDispatch };
};

jest.mock('src/services/PaymentService', () => ({
  __esModule: true,
  default: {
    getPrices: jest.fn().mockResolvedValue([]),
    getUserSubscription: jest.fn().mockResolvedValue({ type: 'free' }),
    getInvoices: jest.fn().mockResolvedValue([]),
    getDefaultPaymentMethod: jest.fn().mockResolvedValue(null),
    billingEnabled: jest.fn().mockResolvedValue(false),
    getFileLimits: jest.fn(),
  },
}));

jest.mock('src/services/AuthService', () => ({
  default: { getAuthCredentials: jest.fn().mockResolvedValue({ credentials: null }) },
}));

jest.mock('src/services/NotificationsService', () => ({
  default: { show: jest.fn() },
}));

jest.mock('assets/lang/strings', () => ({ errors: { loadPrices: '', cancelSubscription: '' } }));

const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

describe('payments slice — loadFileLimitsThunk', () => {
  test('when the thunk resolves with photos access, then photosAccess is true in state', async () => {
    mockPaymentService.getFileLimits.mockResolvedValue({ photosAccess: true });
    const store = makeStore();
    await store.dispatch(paymentsThunks.loadFileLimitsThunk());
    expect(store.getState().payments.photosAccess).toBe(true);
  });

  test('when the thunk resolves without photos access, then photosAccess is false in state', async () => {
    mockPaymentService.getFileLimits.mockResolvedValue({ photosAccess: false });
    const store = makeStore();
    await store.dispatch(paymentsThunks.loadFileLimitsThunk());
    expect(store.getState().payments.photosAccess).toBe(false);
  });

  test('when the thunk resolves with null, then photosAccess remains undefined', async () => {
    mockPaymentService.getFileLimits.mockResolvedValue(null);
    const store = makeStore();
    await store.dispatch(paymentsThunks.loadFileLimitsThunk());
    expect(store.getState().payments.photosAccess).toBeUndefined();
  });
});

describe('payments selectors — hasPhotosAccess', () => {
  test('when photosAccess is not loaded yet, then returns false', () => {
    const store = makeStore();
    expect(paymentsSelectors.hasPhotosAccess(store.getState() as any)).toBe(false);
  });

  test('when photosAccess is true, then returns true', () => {
    const store = makeStore({
      payments: {
        isLoading: false,
        showBilling: false,
        prices: [],
        subscription: { type: 'free' },
        sessionId: '',
        invoices: [],
        defaultPaymentMethod: null,
        photosAccess: true,
      },
    });
    expect(paymentsSelectors.hasPhotosAccess(store.getState() as any)).toBe(true);
  });

  test('when photosAccess is false, then returns false', () => {
    const store = makeStore({
      payments: {
        isLoading: false,
        showBilling: false,
        prices: [],
        subscription: { type: 'free' },
        sessionId: '',
        invoices: [],
        defaultPaymentMethod: null,
        photosAccess: false,
      },
    });
    expect(paymentsSelectors.hasPhotosAccess(store.getState() as any)).toBe(false);
  });
});
