import { act, renderHook } from '@testing-library/react-native';
import asyncStorageService from 'src/services/AsyncStorageService';
import { photosDeviceService } from 'src/services/photos/photosDeviceService';
import { useAppSelector } from 'src/store/hooks';
import { AsyncStorageKey } from 'src/types';
import { usePhotoDevices } from './usePhotoDevices';

jest.mock('src/services/photos/photosDeviceService', () => ({
  photosDeviceService: {
    listDevices: jest.fn(),
  },
}));

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    saveItem: jest.fn(),
  },
}));

jest.mock('src/store/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('src/services/common', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const mockPhotosDeviceService = photosDeviceService as jest.Mocked<typeof photosDeviceService>;
const mockAsyncStorageService = asyncStorageService as jest.Mocked<typeof asyncStorageService>;
const mockUseAppSelector = useAppSelector as jest.Mock;

const flushAsync = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const mockCurrentDeviceId = (deviceId: string | null) => {
  mockUseAppSelector.mockImplementation((selector: (s: { photos: { deviceId: string | null } }) => unknown) =>
    selector({ photos: { deviceId } }),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentDeviceId(null);
  mockAsyncStorageService.getItem.mockResolvedValue(null);
  mockAsyncStorageService.saveItem.mockResolvedValue(undefined);
  mockPhotosDeviceService.listDevices.mockResolvedValue([]);
});

describe('usePhotoDevices', () => {
  test('when devices are registered, then only devices with EXISTS status are returned', async () => {
    mockPhotosDeviceService.listDevices.mockResolvedValueOnce([
      { uuid: 'd1', plainName: 'iPhone', bucket: 'b1', status: 'EXISTS' },
      { uuid: 'd2', plainName: 'Old iPad', bucket: 'b2', status: 'DELETED' },
    ]);

    const { result } = renderHook(() => usePhotoDevices());
    await act(flushAsync);

    expect(result.current.devices).toEqual([{ uuid: 'd1', name: 'iPhone' }]);
  });

  test('when multiple devices are registered, then they are sorted alphabetically by name', async () => {
    mockPhotosDeviceService.listDevices.mockResolvedValueOnce([
      { uuid: 'd1', plainName: 'Pixel 8', bucket: 'b1', status: 'EXISTS' },
      { uuid: 'd2', plainName: 'MacBook', bucket: 'b2', status: 'EXISTS' },
      { uuid: 'd3', plainName: 'iPhone', bucket: 'b3', status: 'EXISTS' },
    ]);

    const { result } = renderHook(() => usePhotoDevices());
    await act(flushAsync);

    expect(result.current.devices.map((device) => device.name)).toEqual(['iPhone', 'MacBook', 'Pixel 8']);
  });

  test('when listing devices fails, then the device list stays empty instead of throwing', async () => {
    mockPhotosDeviceService.listDevices.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => usePhotoDevices());
    await act(flushAsync);

    expect(result.current.devices).toEqual([]);
  });

  test('when a device list is cached, then it is shown immediately without waiting for the network', async () => {
    mockAsyncStorageService.getItem.mockResolvedValueOnce(
      JSON.stringify([{ uuid: 'cached-1', name: 'Cached iPhone' }]),
    );
    let resolveListDevices: (value: Awaited<ReturnType<typeof photosDeviceService.listDevices>>) => void = () =>
      undefined;
    mockPhotosDeviceService.listDevices.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveListDevices = resolve;
      }),
    );

    const { result } = renderHook(() => usePhotoDevices());
    await act(flushAsync);

    expect(result.current.devices).toEqual([{ uuid: 'cached-1', name: 'Cached iPhone' }]);

    await act(async () => {
      resolveListDevices([{ uuid: 'd1', plainName: 'iPhone', bucket: 'b1', status: 'EXISTS' }]);
      await flushAsync();
    });

    expect(result.current.devices).toEqual([{ uuid: 'd1', name: 'iPhone' }]);
  });

  test('when devices are fetched successfully, then the result is cached for next time', async () => {
    mockPhotosDeviceService.listDevices.mockResolvedValueOnce([
      { uuid: 'd1', plainName: 'iPhone', bucket: 'b1', status: 'EXISTS' },
    ]);

    renderHook(() => usePhotoDevices());
    await act(flushAsync);

    expect(mockAsyncStorageService.saveItem).toHaveBeenCalledWith(
      AsyncStorageKey.PhotosDevicesCache,
      JSON.stringify([{ uuid: 'd1', name: 'iPhone' }]),
    );
  });

  test('when the cached device list is corrupted, then it is ignored instead of throwing', async () => {
    mockAsyncStorageService.getItem.mockResolvedValueOnce('not valid json');
    mockPhotosDeviceService.listDevices.mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePhotoDevices());
    await act(flushAsync);

    expect(result.current.devices).toEqual([]);
  });

  test('when the dropdown menu is reopened after devices change on the backend, then reload replaces the list', async () => {
    mockPhotosDeviceService.listDevices.mockResolvedValueOnce([
      { uuid: 'd1', plainName: 'iPhone', bucket: 'b1', status: 'EXISTS' },
    ]);

    const { result } = renderHook(() => usePhotoDevices());
    await act(flushAsync);
    expect(result.current.devices).toEqual([{ uuid: 'd1', name: 'iPhone' }]);

    mockPhotosDeviceService.listDevices.mockResolvedValueOnce([
      { uuid: 'd1', plainName: 'iPhone', bucket: 'b1', status: 'EXISTS' },
      { uuid: 'd2', plainName: 'Pixel 8', bucket: 'b2', status: 'EXISTS' },
    ]);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.devices).toEqual([
      { uuid: 'd1', name: 'iPhone' },
      { uuid: 'd2', name: 'Pixel 8' },
    ]);
  });
});
