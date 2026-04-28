import { photoPermissionService } from '@internxt-mobile/services/photos/photoPermissionService';
import { configureStore } from '@reduxjs/toolkit';
import asyncStorageService from 'src/services/AsyncStorageService';
import { PhotoAssetScanner } from 'src/services/photos/PhotoAssetScanner';
import { PhotoDeduplicator } from 'src/services/photos/PhotoDeduplicator';
import { PhotoDeviceId } from 'src/services/photos/PhotoDeviceId';
import { photosLocalDB } from 'src/services/photos/database/photosLocalDB';
import { AppDispatch } from 'src/store';
import photosReducer, {
  checkPermissionRevocationThunk,
  disableBackupThunk,
  enableBackupThunk,
  hydratePhotosStateThunk,
  initDeviceIdThunk,
  photosSlice,
  PhotosState,
  runBackupCycleThunk,
  runDiscoveryThunk,
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
  isPermissionActive: (status: string) => status === 'granted' || status === 'limited',
  photoPermissionService: {
    getStatus: jest.fn(),
    requestPermission: jest.fn(),
  },
}));

jest.mock('src/services/photos/PhotoDeviceId', () => ({
  PhotoDeviceId: { getOrCreate: jest.fn().mockResolvedValue('mock-device-id') },
}));

jest.mock('src/services/photos/PhotoAssetScanner', () => ({
  PhotoAssetScanner: { scanAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('src/services/photos/PhotoDeduplicator', () => ({
  PhotoDeduplicator: { getAssetsToSync: jest.fn().mockResolvedValue([]) },
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: { init: jest.fn().mockResolvedValue(undefined) },
}));

const mockAsyncStorage = asyncStorageService as jest.Mocked<typeof asyncStorageService>;
const mockPermissionService = photoPermissionService as jest.Mocked<typeof photoPermissionService>;
const mockPhotoDeviceId = PhotoDeviceId as jest.Mocked<typeof PhotoDeviceId>;
const mockScanner = PhotoAssetScanner as jest.Mocked<typeof PhotoAssetScanner>;
const mockDeduplicator = PhotoDeduplicator as jest.Mocked<typeof PhotoDeduplicator>;
const mockPhotosLocalDB = photosLocalDB as jest.Mocked<typeof photosLocalDB>;

const makeStore = () => {
  const store = configureStore({ reducer: { photos: photosReducer } });
  return { ...store, dispatch: store.dispatch as AppDispatch };
};

const getPersistedState = (): PhotosState => {
  const call = (mockAsyncStorage.saveItem.mock.calls as [string, string][]).findLast(
    ([key]) => key === 'photosSettings',
  );
  return JSON.parse(call![1]);
};

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
    const saved: PhotosState = {
      enabled: true,
      networkCondition: 'wifi-and-data',
      permissionStatus: 'granted',
      syncStatus: 'idle',
      pendingCount: 0,
      totalScannedCount: 0,
      deviceId: null,
    };
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

  test('when checkPermissionRevocationThunk runs and backup is disabled, then nothing happens', async () => {
    const store = makeStore();

    await store.dispatch(checkPermissionRevocationThunk());

    expect(mockPermissionService.getStatus).not.toHaveBeenCalled();
    expect(store.getState().photos.enabled).toBe(false);
  });

  test('when checkPermissionRevocationThunk runs and backup is enabled and permission is denied, then backup is disabled', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    mockPermissionService.getStatus.mockResolvedValueOnce('denied');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(checkPermissionRevocationThunk());

    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('denied');
    expect(getPersistedState()).toMatchObject({ enabled: false });
  });

  test('when checkPermissionRevocationThunk runs and backup is enabled and permission is still granted, then backup stays enabled', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    mockPermissionService.getStatus.mockResolvedValueOnce('granted');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(checkPermissionRevocationThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('granted');
  });

  test('when checkPermissionRevocationThunk runs and backup is enabled and permission is limited, then backup stays enabled', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    mockPermissionService.getStatus.mockResolvedValueOnce('limited');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(checkPermissionRevocationThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('limited');
  });

  test('when setNetworkConditionThunk runs with wifi-only after wifi-and-data, then network condition reverts and is persisted', async () => {
    const store = makeStore();
    await store.dispatch(setNetworkConditionThunk('wifi-and-data'));
    await store.dispatch(setNetworkConditionThunk('wifi-only'));

    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(mockAsyncStorage.saveItem).toHaveBeenCalledTimes(2);
    expect(getPersistedState()).toMatchObject({ networkCondition: 'wifi-only' });
  });

  test('when initDeviceIdThunk runs and no id is stored, then a new device id is created and set in state', async () => {
    mockPhotoDeviceId.getOrCreate.mockResolvedValueOnce('new-device-id');

    const store = makeStore();
    await store.dispatch(initDeviceIdThunk());

    expect(store.getState().photos.deviceId).toBe('new-device-id');
  });

  test('when initDeviceIdThunk runs and an id already exists, then the existing id is returned and set in state', async () => {
    mockPhotoDeviceId.getOrCreate.mockResolvedValueOnce('existing-device-id');

    const store = makeStore();
    await store.dispatch(initDeviceIdThunk());

    expect(store.getState().photos.deviceId).toBe('existing-device-id');
    expect(mockPhotoDeviceId.getOrCreate).toHaveBeenCalledTimes(1);
  });

  test('when runDiscoveryThunk runs and backup is disabled, then scanner is not called', async () => {
    const store = makeStore();
    await store.dispatch(runDiscoveryThunk());

    expect(mockScanner.scanAll).not.toHaveBeenCalled();
    expect(store.getState().photos.syncStatus).toBe('idle');
  });

  test('when runDiscoveryThunk runs and scanner returns 10 assets with 3 already synced, then pendingCount is 7', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    const assets = Array.from({ length: 10 }, (_, i) => ({ id: `asset-${i}` }));
    mockScanner.scanAll.mockResolvedValueOnce(assets as never);
    mockDeduplicator.getAssetsToSync.mockResolvedValueOnce(assets.slice(3) as never);

    const store = makeStore();
    await store.dispatch(enableBackupThunk());
    jest.clearAllMocks();
    mockScanner.scanAll.mockResolvedValueOnce(assets as never);
    mockDeduplicator.getAssetsToSync.mockResolvedValueOnce(assets.slice(3) as never);
    mockPhotosLocalDB.init.mockResolvedValueOnce(undefined);
    await store.dispatch(runDiscoveryThunk());

    expect(store.getState().photos.pendingCount).toBe(7);
    expect(store.getState().photos.totalScannedCount).toBe(10);
    expect(store.getState().photos.syncStatus).toBe('idle');
  });

  test('when runDiscoveryThunk runs and scanner returns 0 assets, then pendingCount is 0 and syncStatus is idle', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());
    jest.clearAllMocks();
    mockScanner.scanAll.mockResolvedValueOnce([] as never);
    mockDeduplicator.getAssetsToSync.mockResolvedValueOnce([] as never);
    mockPhotosLocalDB.init.mockResolvedValueOnce(undefined);
    await store.dispatch(runDiscoveryThunk());

    expect(store.getState().photos.pendingCount).toBe(0);
    expect(store.getState().photos.totalScannedCount).toBe(0);
    expect(store.getState().photos.syncStatus).toBe('idle');
  });

  test('when runBackupCycleThunk runs and backup is disabled, then scanner is not called', async () => {
    const store = makeStore();
    await store.dispatch(runBackupCycleThunk());

    expect(mockScanner.scanAll).not.toHaveBeenCalled();
    expect(mockPhotoDeviceId.getOrCreate).not.toHaveBeenCalled();
  });

  test('when runBackupCycleThunk runs and permission is revoked, then scanner is not called', async () => {
    const store = makeStore();
    store.dispatch(photosSlice.actions.setState({ enabled: true, permissionStatus: 'granted' }));
    mockPermissionService.getStatus.mockResolvedValueOnce('denied');

    await store.dispatch(runBackupCycleThunk());

    expect(mockScanner.scanAll).not.toHaveBeenCalled();
    expect(store.getState().photos.enabled).toBe(false);
  });

  test('when runBackupCycleThunk runs and backup is enabled with granted permission, then discovery runs', async () => {
    const store = makeStore();
    store.dispatch(photosSlice.actions.setState({ enabled: true, permissionStatus: 'granted' }));
    mockPermissionService.getStatus.mockResolvedValueOnce('granted');
    mockPhotoDeviceId.getOrCreate.mockResolvedValueOnce('device-id');
    const assets = Array.from({ length: 5 }, (_, i) => ({ id: `asset-${i}` }));
    mockScanner.scanAll.mockResolvedValueOnce(assets as never);
    mockDeduplicator.getAssetsToSync.mockResolvedValueOnce(assets as never);
    mockPhotosLocalDB.init.mockResolvedValueOnce(undefined);

    await store.dispatch(runBackupCycleThunk());
    // drain any background microtasks before asserting
    await Promise.resolve();

    expect(mockPhotoDeviceId.getOrCreate).toHaveBeenCalledTimes(1);
    expect(mockScanner.scanAll).toHaveBeenCalledTimes(1);
    expect(store.getState().photos.pendingCount).toBe(5);
    expect(store.getState().photos.syncStatus).toBe('idle');
  });
});
