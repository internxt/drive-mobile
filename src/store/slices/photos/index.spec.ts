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

  test('when the app starts for the first time, then backup is disabled and set to wifi-only with no permission yet', () => {
    const store = makeStore();
    const { enabled, networkCondition, permissionStatus } = store.getState().photos;

    expect(enabled).toBe(false);
    expect(networkCondition).toBe('wifi-only');
    expect(permissionStatus).toBe('undetermined');
  });

  test('when the app starts and backup settings were previously saved, then those settings are restored', async () => {
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

  test('when the app starts and only some settings were saved, then missing fields use their defaults', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ enabled: true }));

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(store.getState().photos.permissionStatus).toBe('undetermined');
  });

  test('when the app starts and saved settings are corrupted, then all defaults are used', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('NOT_JSON');

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(store.getState().photos.permissionStatus).toBe('undetermined');
  });

  test('when the app starts and nothing was previously saved, then all defaults are used', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const store = makeStore();
    await store.dispatch(hydratePhotosStateThunk());

    expect(store.getState().photos.enabled).toBe(false);
  });

  test('when the user enables backup and grants permission, then backup is turned on and saved', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(true);
    expect(result.permissionStatus).toBe('granted');
    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('granted');
    expect(getPersistedState()).toMatchObject({ enabled: true, permissionStatus: 'granted' });
  });

  test('when the user enables backup and grants limited permission, then backup is turned on and saved', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('limited');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(true);
    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('limited');
    expect(getPersistedState()).toMatchObject({ enabled: true, permissionStatus: 'limited' });
  });

  test('when the user enables backup but denies permission, then backup stays off and the denial is saved', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('denied');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(false);
    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('denied');
    expect(getPersistedState()).toMatchObject({ enabled: false, permissionStatus: 'denied' });
  });

  test('when the user enables backup but permission status is undetermined, then backup stays off', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('undetermined');

    const store = makeStore();
    const result = await store.dispatch(enableBackupThunk()).unwrap();

    expect(result.isGranted).toBe(false);
    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('undetermined');
  });

  test('when the user disables backup, then backup is turned off and the permission status is unchanged', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(disableBackupThunk());

    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('granted');
    expect(getPersistedState()).toMatchObject({ enabled: false, permissionStatus: 'granted' });
  });

  test('when the user switches to wifi and mobile data, then the setting is saved', async () => {
    const store = makeStore();
    await store.dispatch(setNetworkConditionThunk('wifi-and-data'));

    expect(store.getState().photos.networkCondition).toBe('wifi-and-data');
    expect(getPersistedState()).toMatchObject({ networkCondition: 'wifi-and-data' });
  });

  test('when the permission check runs and backup is disabled, then no permission check is done', async () => {
    const store = makeStore();

    await store.dispatch(checkPermissionRevocationThunk());

    expect(mockPermissionService.getStatus).not.toHaveBeenCalled();
    expect(store.getState().photos.enabled).toBe(false);
  });

  test('when the permission check runs and the user has revoked access, then backup is automatically disabled', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    mockPermissionService.getStatus.mockResolvedValueOnce('denied');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(checkPermissionRevocationThunk());

    expect(store.getState().photos.enabled).toBe(false);
    expect(store.getState().photos.permissionStatus).toBe('denied');
    expect(getPersistedState()).toMatchObject({ enabled: false });
  });

  test('when the permission check runs and the user still has access granted, then backup continues running', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    mockPermissionService.getStatus.mockResolvedValueOnce('granted');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(checkPermissionRevocationThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('granted');
  });

  test('when the permission check runs and the user has limited access, then backup continues running', async () => {
    mockPermissionService.requestPermission.mockResolvedValueOnce('granted');
    mockPermissionService.getStatus.mockResolvedValueOnce('limited');

    const store = makeStore();
    await store.dispatch(enableBackupThunk());

    await store.dispatch(checkPermissionRevocationThunk());

    expect(store.getState().photos.enabled).toBe(true);
    expect(store.getState().photos.permissionStatus).toBe('limited');
  });

  test('when the user switches back to wifi-only, then the setting is updated and saved', async () => {
    const store = makeStore();
    await store.dispatch(setNetworkConditionThunk('wifi-and-data'));
    await store.dispatch(setNetworkConditionThunk('wifi-only'));

    expect(store.getState().photos.networkCondition).toBe('wifi-only');
    expect(mockAsyncStorage.saveItem).toHaveBeenCalledTimes(2);
    expect(getPersistedState()).toMatchObject({ networkCondition: 'wifi-only' });
  });

  test('when the device is first registered for backup, then a new device identifier is created', async () => {
    mockPhotoDeviceId.getOrCreate.mockResolvedValueOnce('new-device-id');

    const store = makeStore();
    await store.dispatch(initDeviceIdThunk());

    expect(store.getState().photos.deviceId).toBe('new-device-id');
  });

  test('when the device was already registered for backup, then the existing identifier is reused', async () => {
    mockPhotoDeviceId.getOrCreate.mockResolvedValueOnce('existing-device-id');

    const store = makeStore();
    await store.dispatch(initDeviceIdThunk());

    expect(store.getState().photos.deviceId).toBe('existing-device-id');
    expect(mockPhotoDeviceId.getOrCreate).toHaveBeenCalledTimes(1);
  });

  test('when backup is disabled and discovery runs, then no photos are scanned', async () => {
    const store = makeStore();
    await store.dispatch(runDiscoveryThunk());

    expect(mockScanner.scanAll).not.toHaveBeenCalled();
    expect(store.getState().photos.syncStatus).toBe('idle');
  });

  test('when 10 photos are found and 3 are already synced, then 7 are reported as pending', async () => {
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

  test('when no photos are found on the device, then zero photos are pending and the status returns to idle', async () => {
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

  test('when a backup cycle starts and backup is disabled, then no photos are scanned', async () => {
    const store = makeStore();
    await store.dispatch(runBackupCycleThunk());

    expect(mockScanner.scanAll).not.toHaveBeenCalled();
    expect(mockPhotoDeviceId.getOrCreate).not.toHaveBeenCalled();
  });

  test('when a backup cycle starts and the user has revoked permission, then no photos are scanned and backup is disabled', async () => {
    const store = makeStore();
    store.dispatch(photosSlice.actions.setState({ enabled: true, permissionStatus: 'granted' }));
    mockPermissionService.getStatus.mockResolvedValueOnce('denied');

    await store.dispatch(runBackupCycleThunk());

    expect(mockScanner.scanAll).not.toHaveBeenCalled();
    expect(store.getState().photos.enabled).toBe(false);
  });

  test('when a backup cycle starts and all conditions are met, then photos are scanned and the pending count is updated', async () => {
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
