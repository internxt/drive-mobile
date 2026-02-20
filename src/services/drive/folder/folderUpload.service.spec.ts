import { folderUploadService } from './folderUpload.service';

const mockPickDirectory = jest.fn();
const mockIsErrorWithCode = jest.fn();

jest.mock('@react-native-documents/picker', () => ({
  pickDirectory: (...args: unknown[]) => mockPickDirectory(...args),
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: (...args: unknown[]) => mockIsErrorWithCode(...args),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../assets/lang/strings', () => ({
  __esModule: true,
  default: {
    generic: { unnamedFolder: 'Unnamed folder' },
  },
}));

describe('folderUploadService.pickFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsErrorWithCode.mockReturnValue(false);
  });

  describe('when a folder is selected', () => {
    it('returns the URI and the folder name extracted from the path', async () => {
      mockPickDirectory.mockResolvedValue({ uri: 'file:///var/mobile/Documents/MyPhotos' });

      const result = await folderUploadService.pickFolder();

      expect(result).toEqual({ uri: 'file:///var/mobile/Documents/MyPhotos', name: 'MyPhotos' });
    });

    it('strips a trailing slash before extracting the name', async () => {
      mockPickDirectory.mockResolvedValue({ uri: 'file:///var/mobile/Documents/MyPhotos/' });

      const result = await folderUploadService.pickFolder();

      expect(result).toEqual({ uri: 'file:///var/mobile/Documents/MyPhotos/', name: 'MyPhotos' });
    });

    it('decodes percent-encoded characters in the folder name', async () => {
      mockPickDirectory.mockResolvedValue({ uri: 'file:///var/mobile/Documents/My%20Folder' });

      const result = await folderUploadService.pickFolder();

      expect(result).toEqual({ uri: 'file:///var/mobile/Documents/My%20Folder', name: 'My Folder' });
    });

    it('falls back to the unnamed folder string when the name segment is empty', async () => {
      mockPickDirectory.mockResolvedValue({ uri: 'file:///' });

      const result = await folderUploadService.pickFolder();

      expect(result?.name).toBe('Unnamed folder');
    });

    it('passes requestLongTermAccess: false to pickDirectory', async () => {
      mockPickDirectory.mockResolvedValue({ uri: 'file:///some/folder' });

      await folderUploadService.pickFolder();

      expect(mockPickDirectory).toHaveBeenCalledWith({ requestLongTermAccess: false });
    });
  });

  describe('when the user cancels', () => {
    it('returns null', async () => {
      const cancelError = Object.assign(new Error('cancelled'), { code: 'OPERATION_CANCELED' });
      mockPickDirectory.mockRejectedValue(cancelError);
      mockIsErrorWithCode.mockReturnValue(true);

      const result = await folderUploadService.pickFolder();

      expect(result).toBeNull();
    });
  });

  describe('when an unexpected error occurs', () => {
    it('rethrows the error', async () => {
      const unexpectedError = new Error('network error');
      mockPickDirectory.mockRejectedValue(unexpectedError);
      mockIsErrorWithCode.mockReturnValue(false);

      await expect(folderUploadService.pickFolder()).rejects.toBe(unexpectedError);
    });
  });
});
