import { PhotoDeviceNameConflictError } from './errors';
import { photosDeviceService } from './photosDeviceService';

jest.mock('src/services/common/sdk/SdkManager', () => ({
  SdkManager: {
    getInstance: jest.fn().mockReturnValue({
      getApiSecurity: jest.fn().mockReturnValue({ newToken: 'test-token' }),
    }),
  },
}));

jest.mock('src/services/AppService', () => ({
  constants: { DRIVE_NEW_API_URL: 'https://api.test.com/drive' },
}));

jest.mock('src/helpers/headers', () => ({
  getHeaders: jest.fn().mockResolvedValue(new Headers({ Authorization: 'Bearer test-token' })),
}));

const existingDevice = {
  uuid: 'device-uuid-1',
  plainName: 'Internxt iPhone',
  bucket: 'photos-bucket',
  status: 'EXISTS',
};

const mockFetch = (status: number, body: unknown): void => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('photosDeviceService.listDevices', () => {
  test('when the server returns a list of devices, then they are parsed and returned', async () => {
    mockFetch(200, [existingDevice]);

    const result = await photosDeviceService.listDevices();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(existingDevice);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/photos/devices'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('when the server returns an error, then an error is thrown', async () => {
    mockFetch(500, {});

    await expect(photosDeviceService.listDevices()).rejects.toThrow('listDevices failed');
  });
});

describe('photosDeviceService.createDevice', () => {
  test('when a device is created successfully, then the created device is returned', async () => {
    mockFetch(200, existingDevice);

    const result = await photosDeviceService.createDevice('Internxt iPhone');

    expect(result).toEqual(existingDevice);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/photos/devices'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ deviceName: 'Internxt iPhone' }),
      }),
    );
  });

  test('when the server returns 409, then a PhotoDeviceNameConflictError is thrown', async () => {
    mockFetch(409, {});

    await expect(photosDeviceService.createDevice('Internxt iPhone')).rejects.toThrow(PhotoDeviceNameConflictError);
  });

  test('when the server returns another error, then a generic error is thrown', async () => {
    mockFetch(500, {});

    await expect(photosDeviceService.createDevice('Internxt iPhone')).rejects.toThrow('createDevice failed');
  });
});

describe('photosDeviceService.getDevice', () => {
  test('when the device is found, then it is returned', async () => {
    mockFetch(200, existingDevice);

    const result = await photosDeviceService.getDevice('device-uuid-1');

    expect(result).toEqual(existingDevice);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/photos/devices/device-uuid-1'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  test('when the device is not found, then null is returned', async () => {
    mockFetch(404, {});

    const result = await photosDeviceService.getDevice('device-uuid-missing');

    expect(result).toBeNull();
  });

  test('when the server returns an error, then an error is thrown', async () => {
    mockFetch(500, {});

    await expect(photosDeviceService.getDevice('device-uuid-1')).rejects.toThrow('getDevice failed');
  });
});

describe('photosDeviceService.deleteDevice', () => {
  test('when the device is deleted successfully, then the call resolves without error', async () => {
    mockFetch(200, {});

    await expect(photosDeviceService.deleteDevice('device-uuid-1')).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/photos/devices/device-uuid-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('when the server returns an error, then an error is thrown', async () => {
    mockFetch(500, {});

    await expect(photosDeviceService.deleteDevice('device-uuid-1')).rejects.toThrow('deleteDevice failed');
  });
});

describe('photosDeviceService.renameDevice', () => {
  test('when the device is renamed successfully, then the updated device is returned', async () => {
    const updatedDevice = { ...existingDevice, plainName: 'New name' };
    mockFetch(200, updatedDevice);

    const result = await photosDeviceService.renameDevice('device-uuid-1', 'New name');

    expect(result).toEqual(updatedDevice);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/photos/devices/device-uuid-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ deviceName: 'New name' }),
      }),
    );
  });

  test('when the server returns an error, then an error is thrown', async () => {
    mockFetch(500, {});

    await expect(photosDeviceService.renameDevice('device-uuid-1', 'New name')).rejects.toThrow('renameDevice failed');
  });
});
