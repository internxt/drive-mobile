import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { SdkManager } from 'src/services/common/sdk/SdkManager';
import { PhotoDeviceNameConflictError } from './errors';
import { photosDeviceService } from './photosDeviceService';

jest.mock('src/services/common/sdk/SdkManager', () => ({
  SdkManager: {
    getInstance: jest.fn().mockReturnValue({
      photos: {
        listDevices: jest.fn(),
        createDevice: jest.fn(),
        getDevice: jest.fn(),
        deleteDevice: jest.fn(),
        renameDevice: jest.fn(),
      },
    }),
  },
}));

const { photos: mockPhotos } = SdkManager.getInstance() as unknown as { photos: Record<string, jest.Mock> };

const existingDevice = {
  uuid: 'device-uuid-1',
  plainName: 'Internxt iPhone',
  bucket: 'photos-bucket',
  status: 'EXISTS' as const,
};

const makeAxiosError = (status: number) =>
  new AxiosResponseError('error', 'GET /photos/devices', {
    status,
    data: {},
    headers: {},
    config: {} as never,
    statusText: '',
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('photosDeviceService.listDevices', () => {
  test('when the server returns a list of devices, then they are returned', async () => {
    mockPhotos.listDevices.mockResolvedValue([existingDevice]);

    const result = await photosDeviceService.listDevices();

    expect(result).toEqual([existingDevice]);
    expect(mockPhotos.listDevices).toHaveBeenCalledTimes(1);
  });

  test('when the SDK throws, then the error propagates', async () => {
    mockPhotos.listDevices.mockRejectedValue(new Error('network error'));

    await expect(photosDeviceService.listDevices()).rejects.toThrow('network error');
  });
});

describe('photosDeviceService.createDevice', () => {
  test('when a device is created successfully, then the created device is returned', async () => {
    mockPhotos.createDevice.mockResolvedValue(existingDevice);

    const result = await photosDeviceService.createDevice('Internxt iPhone');

    expect(result).toEqual(existingDevice);
    expect(mockPhotos.createDevice).toHaveBeenCalledWith('Internxt iPhone');
  });

  test('when the server returns 409, then a PhotoDeviceNameConflictError is thrown', async () => {
    mockPhotos.createDevice.mockRejectedValue(makeAxiosError(409));

    await expect(photosDeviceService.createDevice('Internxt iPhone')).rejects.toThrow(PhotoDeviceNameConflictError);
  });

  test('when the server returns another error, then it propagates unchanged', async () => {
    mockPhotos.createDevice.mockRejectedValue(makeAxiosError(500));

    await expect(photosDeviceService.createDevice('Internxt iPhone')).rejects.toBeInstanceOf(AxiosResponseError);
  });
});

describe('photosDeviceService.getDevice', () => {
  test('when the device is found, then it is returned', async () => {
    mockPhotos.getDevice.mockResolvedValue(existingDevice);

    const result = await photosDeviceService.getDevice('device-uuid-1');

    expect(result).toEqual(existingDevice);
    expect(mockPhotos.getDevice).toHaveBeenCalledWith('device-uuid-1');
  });

  test('when the device is not found, then null is returned', async () => {
    mockPhotos.getDevice.mockRejectedValue(makeAxiosError(404));

    const result = await photosDeviceService.getDevice('device-uuid-missing');

    expect(result).toBeNull();
  });

  test('when the server returns a non-404 error, then it propagates', async () => {
    mockPhotos.getDevice.mockRejectedValue(makeAxiosError(500));

    await expect(photosDeviceService.getDevice('device-uuid-1')).rejects.toBeInstanceOf(AxiosResponseError);
  });
});

describe('photosDeviceService.deleteDevice', () => {
  test('when the device is deleted successfully, then the call resolves without error', async () => {
    mockPhotos.deleteDevice.mockResolvedValue(undefined);

    await expect(photosDeviceService.deleteDevice('device-uuid-1')).resolves.toBeUndefined();
    expect(mockPhotos.deleteDevice).toHaveBeenCalledWith('device-uuid-1');
  });

  test('when the server returns an error, then it propagates', async () => {
    mockPhotos.deleteDevice.mockRejectedValue(makeAxiosError(500));

    await expect(photosDeviceService.deleteDevice('device-uuid-1')).rejects.toBeInstanceOf(AxiosResponseError);
  });
});

describe('photosDeviceService.renameDevice', () => {
  test('when the device is renamed successfully, then the updated device is returned', async () => {
    const updatedDevice = { ...existingDevice, plainName: 'New name' };
    mockPhotos.renameDevice.mockResolvedValue(updatedDevice);

    const result = await photosDeviceService.renameDevice('device-uuid-1', 'New name');

    expect(result).toEqual(updatedDevice);
    expect(mockPhotos.renameDevice).toHaveBeenCalledWith('device-uuid-1', 'New name');
  });

  test('when the server returns an error, then it propagates', async () => {
    mockPhotos.renameDevice.mockRejectedValue(makeAxiosError(500));

    await expect(photosDeviceService.renameDevice('device-uuid-1', 'New name')).rejects.toBeInstanceOf(
      AxiosResponseError,
    );
  });
});
