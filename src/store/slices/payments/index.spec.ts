import { configureStore } from '@reduxjs/toolkit';
import asyncStorageService from 'src/services/AsyncStorageService';
import paymentService from 'src/services/PaymentService';
import { AppDispatch, RootState } from 'src/store';
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
    getMailAccess: jest.fn(),
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

const GRANTED_FEATURE_ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;

describe('payments slice — loadFileLimitsThunk', () => {
  beforeEach(() => {
    mockPaymentService.getFileLimits.mockReset();
    jest.spyOn(asyncStorageService, 'getItem').mockResolvedValue(null);
    jest.spyOn(asyncStorageService, 'saveItem').mockResolvedValue();
    jest.spyOn(asyncStorageService, 'deleteItem').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  test('when access was granted less than five minutes ago, then it is not asked again', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(JSON.stringify({ hasAccess: true, cachedAt: Date.now() }));
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadFileLimitsThunk());

    expect(mockPaymentService.getFileLimits).not.toHaveBeenCalled();
    expect(store.getState().payments.photosAccess).toBe(true);
  });

  test('when access was granted more than five minutes ago, then it is asked again', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(
        JSON.stringify({ hasAccess: true, cachedAt: Date.now() - GRANTED_FEATURE_ACCESS_CACHE_TTL_MS - 1 }),
      );
    mockPaymentService.getFileLimits.mockResolvedValue({ photosAccess: false });
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadFileLimitsThunk());

    expect(mockPaymentService.getFileLimits).toHaveBeenCalledTimes(1);
    expect(store.getState().payments.photosAccess).toBe(false);
  });

  test('when the user had no access and asks again, then the server is asked every time', async () => {
    mockPaymentService.getFileLimits.mockResolvedValueOnce({ photosAccess: false });
    mockPaymentService.getFileLimits.mockResolvedValueOnce({ photosAccess: true });
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadFileLimitsThunk());
    await store.dispatch(paymentsThunks.loadFileLimitsThunk());

    expect(mockPaymentService.getFileLimits).toHaveBeenCalledTimes(2);
    expect(asyncStorageService.saveItem).toHaveBeenCalledTimes(1);
    expect(store.getState().payments.photosAccess).toBe(true);
  });

  test('when the server says there is no access, then a previously granted access is removed', async () => {
    mockPaymentService.getFileLimits.mockResolvedValue({ photosAccess: false });
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadFileLimitsThunk());

    expect(asyncStorageService.saveItem).not.toHaveBeenCalled();
    expect(asyncStorageService.deleteItem).toHaveBeenCalledTimes(1);
  });

  test('when the granted access has expired and the server cannot be reached, then the access is kept', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(
        JSON.stringify({ hasAccess: true, cachedAt: Date.now() - GRANTED_FEATURE_ACCESS_CACHE_TTL_MS - 1 }),
      );
    mockPaymentService.getFileLimits.mockResolvedValue(null);
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadFileLimitsThunk());

    expect(store.getState().payments.photosAccess).toBe(true);
  });

  test('when the stored access was saved by an older version, then the server is asked again', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(JSON.stringify({ photosAccess: true, cachedAt: Date.now() }));
    mockPaymentService.getFileLimits.mockResolvedValue({ photosAccess: true });
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadFileLimitsThunk());

    expect(mockPaymentService.getFileLimits).toHaveBeenCalledTimes(1);
    expect(store.getState().payments.photosAccess).toBe(true);
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

describe('Knowing whether the plan includes Mail', () => {
  beforeEach(() => {
    mockPaymentService.getMailAccess.mockReset();
    jest.spyOn(asyncStorageService, 'getItem').mockResolvedValue(null);
    jest.spyOn(asyncStorageService, 'saveItem').mockResolvedValue();
    jest.spyOn(asyncStorageService, 'deleteItem').mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('when the plan includes Mail, then Mail is unlocked', async () => {
    mockPaymentService.getMailAccess.mockResolvedValue(true);
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(true);
  });

  test('when the plan does not include Mail, then Mail stays locked', async () => {
    mockPaymentService.getMailAccess.mockResolvedValue(false);
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(false);
  });

  test('when the plan has not been checked yet, then Mail is locked', () => {
    const store = makeStore();

    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(false);
  });

  test('when the plan cannot be checked, then the access known before is kept', async () => {
    mockPaymentService.getMailAccess.mockResolvedValue(null);
    const store = makeStore({ payments: { ...makeStore().getState().payments, mailAccess: true } });

    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(true);
  });

  test('when Mail was granted less than five minutes ago, then it is not asked again', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(JSON.stringify({ hasAccess: true, cachedAt: Date.now() }));
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(mockPaymentService.getMailAccess).not.toHaveBeenCalled();
    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(true);
  });

  test('when the stored Mail access was saved by an older version, then the server is asked again', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(JSON.stringify({ mailAccess: true, cachedAt: Date.now() }));
    mockPaymentService.getMailAccess.mockResolvedValue(true);
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(mockPaymentService.getMailAccess).toHaveBeenCalledTimes(1);
    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(true);
  });

  test('when the plan did not include Mail, then it is asked again every time', async () => {
    mockPaymentService.getMailAccess.mockResolvedValueOnce(false);
    mockPaymentService.getMailAccess.mockResolvedValueOnce(true);
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadMailAccessThunk());
    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(mockPaymentService.getMailAccess).toHaveBeenCalledTimes(2);
    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(true);
  });

  test('when Mail was granted more than five minutes ago, then it is asked again', async () => {
    jest
      .spyOn(asyncStorageService, 'getItem')
      .mockResolvedValue(
        JSON.stringify({ hasAccess: true, cachedAt: Date.now() - GRANTED_FEATURE_ACCESS_CACHE_TTL_MS - 1 }),
      );
    mockPaymentService.getMailAccess.mockResolvedValue(false);
    const store = makeStore();

    await store.dispatch(paymentsThunks.loadMailAccessThunk());

    expect(mockPaymentService.getMailAccess).toHaveBeenCalledTimes(1);
    expect(paymentsSelectors.hasMailAccess(store.getState() as RootState)).toBe(false);
  });
});
