import * as useCases from '@internxt-mobile/useCases/drive';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import asyncStorageService from '../../services/AsyncStorageService';
import photosReducer, { PhotosState } from '../../store/slices/photos';
import { useDiscoverPhotosSheet } from './useDiscoverPhotosSheet';

jest.mock('../../services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    saveItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('@internxt-mobile/useCases/drive', () => ({
  onDriveItemUploaded: jest.fn(),
}));

const mockAsyncStorage = asyncStorageService as jest.Mocked<typeof asyncStorageService>;
const mockOnDriveItemUploaded = useCases.onDriveItemUploaded as jest.Mock;

const makeWrapper = (photosState?: Partial<PhotosState>) => {
  const store = configureStore({
    reducer: { photos: photosReducer },
    preloadedState: {
      photos: {
        enabled: false,
        networkCondition: 'wifi-only',
        permissionStatus: 'undetermined',
        syncStatus: 'idle',
        pendingBackupAssets: 0,
        totalScannedAssets: 0,
        totalAssetsUploaded: 0,
        currentUploadProgress: 0,
        lastSyncTimestamp: null,
        uploadingAssetIds: [],
        deviceId: null,
        sessionTotalAssets: 0,
        sessionUploadedAssets: 0,
        cloudFetchRevision: 0,
        isFetchingCloudHistory: false,
        ...photosState,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
};

const simulateUpload = async () => {
  const listener = mockOnDriveItemUploaded.mock.calls.at(-1)?.[0];
  await act(() => listener());
};

describe('useDiscoverPhotosSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnDriveItemUploaded.mockReturnValue(jest.fn());
  });

  it('when hook mounts, then sheet is closed', () => {
    const { result } = renderHook(() => useDiscoverPhotosSheet(jest.fn()), { wrapper: makeWrapper() });

    expect(result.current.isOpen).toBe(false);
  });

  it('when upload completes and photos not enabled and not seen, then sheet opens', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDiscoverPhotosSheet(jest.fn()), { wrapper: makeWrapper() });

    await simulateUpload();

    expect(result.current.isOpen).toBe(true);
  });

  it('when upload completes and photos already enabled, then sheet stays closed and storage is not checked', async () => {
    const { result } = renderHook(() => useDiscoverPhotosSheet(jest.fn()), {
      wrapper: makeWrapper({ enabled: true }),
    });

    await simulateUpload();

    expect(result.current.isOpen).toBe(false);
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('when upload completes and discover sheet was previously seen, then sheet stays closed and flag is not re-written', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('true');
    const { result } = renderHook(() => useDiscoverPhotosSheet(jest.fn()), { wrapper: makeWrapper() });

    await simulateUpload();

    expect(result.current.isOpen).toBe(false);
    expect(mockAsyncStorage.saveItem).not.toHaveBeenCalled();
  });

  it('when dismissed, then seen flag is persisted and sheet closes', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDiscoverPhotosSheet(jest.fn()), { wrapper: makeWrapper() });
    await simulateUpload();
    await act(() => result.current.onDismiss());

    expect(mockAsyncStorage.saveItem).toHaveBeenCalledWith('photosDiscoverSeen', 'true');
    expect(result.current.isOpen).toBe(false);
  });

  it('when start photos is tapped, then sheet is dismissed and navigation callback is called', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    const onNavigateToPhotos = jest.fn();
    const { result } = renderHook(() => useDiscoverPhotosSheet(onNavigateToPhotos), { wrapper: makeWrapper() });
    await simulateUpload();

    await act(() => result.current.onStartPhotos());

    expect(result.current.isOpen).toBe(false);
    expect(mockAsyncStorage.saveItem).toHaveBeenCalledWith('photosDiscoverSeen', 'true');
    expect(onNavigateToPhotos).toHaveBeenCalledTimes(1);
  });
});
