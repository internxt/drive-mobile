import secureStorageService from 'src/services/SecureStorageService';
import { PhotoDeviceId } from './PhotoDeviceId';

jest.mock('react-native-uuid', () => ({ v4: jest.fn(() => 'generated-uuid') }));

jest.mock('src/services/SecureStorageService', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockGetItem = secureStorageService.getItem as jest.Mock;
const mockSetItem = secureStorageService.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PhotoDeviceId', () => {
  test('when a device ID is already stored, then it is returned without creating a new one', async () => {
    mockGetItem.mockResolvedValue('existing-device-id');

    const id = await PhotoDeviceId.getOrCreate();

    expect(id).toBe('existing-device-id');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  test('when no device ID is stored, then a new one is generated and saved', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);

    const id = await PhotoDeviceId.getOrCreate();

    expect(id).toBe('generated-uuid');
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).toHaveBeenCalledWith(expect.any(String), 'generated-uuid');
  });

  test('when no device ID is stored, then successive calls generate only one ID per call', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);

    await PhotoDeviceId.getOrCreate();
    await PhotoDeviceId.getOrCreate();

    expect(mockSetItem).toHaveBeenCalledTimes(2);
  });
});
