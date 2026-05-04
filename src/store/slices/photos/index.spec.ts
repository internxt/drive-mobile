import { photoPermissionService } from '@internxt-mobile/services/photos/photoPermissionService';
import { configureStore } from '@reduxjs/toolkit';
import asyncStorageService from 'src/services/AsyncStorageService';
import { AppDispatch } from 'src/store';
import photosReducer, {
  disableBackupThunk,
  enableBackupThunk,
  hydratePhotosStateThunk,
  PhotosState,
  setNetworkConditionThunk,
} from './index';

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    saveItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@internxt-mobile/services/photos/photoPermissionService', () => ({
  photoPermissionService: {
    getStatus: jest.fn(),
    requestPermission: jest.fn(),
  },
}));

const mockAsyncStorage = asyncStorageService as jest.Mocked<typeof asyncStorageService>;
const mockPermissionService = photoPermissionService as jest.Mocked<typeof photoPermissionService>;

const makeStore = () => {
  const store = configureStore({ reducer: { photos: photosReducer } });
  return { ...store, dispatch: store.dispatch as AppDispatch };
};

const getPersistedState = (): PhotosState =>
  JSON.parse((mockAsyncStorage.saveItem.mock.calls.at(-1) as [string, string])[1]);

describe('photos slice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when store initializes, then backup is disabled with wifi-only and undetermined permission', () => {
    const store = makeStore();
    const { enabled, networkCondition, permissionStatus } = store.getState().photos;

    expect(enabled).toBe(false);
    expect(networkCondition).toBe('wifi-only');
    expect(permissionStatus).toBe('undetermined');
  });

  test('when hydratePhotosStateThunk runs with persisted data, then state reflects saved values', async () => {
    const saved: PhotosState = { enabled: true, networkCondition: 'wifi-and-data', permissionStatus: 'granted' };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(saved));

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.networkCondition).toBe('wifi-and-data');
    expect(store.getState().photos.permissionStatus).toBe('granted');
  });

  test('when hydratePhotosStateThunk runs with partial data, then missing fields keep defaults', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ enabled: true }));

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(store.getState().photos.permissionStatus).toBe('undetermined');
  });

  test('when hydratePhotosStateThunk runs with corrupted JSON, then all defaults are preserved', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('NOT_JSON');

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(store.getState().photos.permissionStatus).toBe('undetermined');
  });

  test('when hydratePhotosStateThunk runs with nothing persisted, then state keeps defaults', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(false);
  });

  test('when enableBackupThunk runs and permission is granted, then backup is enabled and persisted correctly', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(true);
    expect(result.permissionStatus).toBe('granted');
    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('granted');
    expect(getPersistedState()).toMatchObject({ enabled: true, permissionStatus: 'granted' });
  });

  test('when enableBackupThunk runs and permission is limited, then backup is enabled and persisted correctly', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('limited');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(true);
    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('limited');
    expect(getPersistedState()).toMatchObject({ enabled: true, permissionStatus: 'limited' });
  });

  test('when enableBackupThunk runs and permission is denied, then backup stays disabled and persisted correctly', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('denied');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(false);
    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('denied');
    expect(getPersistedState()).toMatchObject({ enabled: false, permissionStatus: 'denied' });
  });

  test('when enableBackupThunk runs and permission is undetermined, then backup stays disabled', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('undetermined');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(false);
    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('undetermined');
  });

  test('when disableBackupThunk runs after backup was enabled, then backup is disabled and permission status is untouched', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(disableBackupThunk());

    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('granted');
    expect(getPersistedState()).toMatchObject({ enabled: false, permissionStatus: 'granted' });
  });

  test('when setNetworkConditionThunk runs with wifi-and-data, then network condition is updated and persisted', async () => {
    const store = makeStore();
    await store.dispatch(setNetworkConditionThunk('wifi-and-data'));

    expect(store.getState().photos.networkCondition).toBe('wifi-and-data');
    expect(getPersistedState()).toMatchObject({ networkCondition: 'wifi-and-data' });
  });

  test('when setNetworkConditionThunk runs with wifi-only after wifi-and-data, then network condition reverts and is persisted', async () => {
    const store = makeStore();
    await store.dispatch(setNetworkConditionThunk('wifi-and-data'));
    await store.dispatch(setNetworkConditionThunk('wifi-only'));

    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(mockAsyncStorage.saveItem).toHaveBeenCalledTimes(2);
    expect(getPersistedState()).toMatchObject({ networkCondition: 'wifi-only' });
  });
});
