import { configureStore } from '@reduxjs/toolkit';

const mockLoadMaxUploadFileSize = jest.fn();
jest.mock('src/services/StorageService', () => ({
  __esModule: true,
  default: {
    loadMaxUploadFileSize: () => mockLoadMaxUploadFileSize(),
    loadLimit: jest.fn(),
  },
}));

jest.mock('../drive', () => ({
  driveThunks: { loadUsageThunk: () => ({ type: 'drive/loadUsage/mocked' }) },
}));

jest.mock('@internxt-mobile/services/AnalyticsService', () => ({
  __esModule: true,
  default: { identify: jest.fn(), track: jest.fn() },
  AnalyticsEventKey: { Usage: 'usage' },
}));

import storageReducer, { storageThunks } from './index';

const makeStore = (preloaded?: Parameters<typeof storageReducer>[0]) => {
  const store = configureStore({
    reducer: { storage: storageReducer },
    preloadedState: preloaded ? { storage: preloaded } : undefined,
  });
  return store as unknown as {
    dispatch: (action: unknown) => Promise<unknown>;
    getState: () => { storage: ReturnType<typeof storageReducer> };
  };
};

describe('loadMaxUploadFileSizeThunk', () => {
  beforeEach(() => {
    mockLoadMaxUploadFileSize.mockReset();
  });

  test('when fulfilled, then it stores the value and a recent fetchedAt timestamp', async () => {
    mockLoadMaxUploadFileSize.mockResolvedValue(2048);
    const store = makeStore();
    const before = Date.now();

    await store.dispatch(storageThunks.loadMaxUploadFileSizeThunk());

    const state = store.getState().storage;
    expect(state.maxUploadFileSize).toBe(2048);
    expect(state.maxUploadFileSizeFetchedAt).toBeGreaterThanOrEqual(before);
  });
});

describe('ensureMaxUploadFileSizeFresh', () => {
  beforeEach(() => {
    mockLoadMaxUploadFileSize.mockReset();
  });

  test('when last fetch is within the TTL, then it does not refetch', async () => {
    mockLoadMaxUploadFileSize.mockResolvedValue(999);
    const store = makeStore({
      limit: 0,
      totalUsage: 0,
      maxUploadFileSize: 100,
      maxUploadFileSizeFetchedAt: Date.now() - 10_000,
    });

    await store.dispatch(storageThunks.ensureMaxUploadFileSizeFresh());

    expect(mockLoadMaxUploadFileSize).not.toHaveBeenCalled();
    expect(store.getState().storage.maxUploadFileSize).toBe(100);
  });

  test('when last fetch is older than the TTL, then it refetches', async () => {
    mockLoadMaxUploadFileSize.mockResolvedValue(5000);
    const store = makeStore({
      limit: 0,
      totalUsage: 0,
      maxUploadFileSize: 100,
      maxUploadFileSizeFetchedAt: Date.now() - 120_000,
    });

    await store.dispatch(storageThunks.ensureMaxUploadFileSizeFresh());

    expect(mockLoadMaxUploadFileSize).toHaveBeenCalledTimes(1);
    expect(store.getState().storage.maxUploadFileSize).toBe(5000);
  });

  test('when never fetched (fetchedAt = 0), then it fetches', async () => {
    mockLoadMaxUploadFileSize.mockResolvedValue(1);
    const store = makeStore();

    await store.dispatch(storageThunks.ensureMaxUploadFileSizeFresh());

    expect(mockLoadMaxUploadFileSize).toHaveBeenCalledTimes(1);
    expect(store.getState().storage.maxUploadFileSize).toBe(1);
  });
});
