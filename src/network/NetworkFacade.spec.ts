import * as RNFS from '@dr.pogodin/react-native-fs';
import { Network } from '@internxt/sdk/dist/network';
import { ripemd160 } from '../@inxt-js/lib/crypto';
import { NetworkFacade } from './NetworkFacade';

jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    executeSql: jest.fn(),
    close: jest.fn(),
  })),
  DEBUG: jest.fn(),
}));

jest.mock('@internxt/sdk/dist/network/upload', () => ({
  uploadFile: jest.fn().mockResolvedValue('mock-file-id'),
}));

jest.mock('@dr.pogodin/react-native-fs', () => ({
  stat: jest.fn(),
  hash: jest.fn(),
  unlink: jest.fn(),
  exists: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  downloadFile: jest.fn(),
  uploadFiles: jest.fn(),
}));

const mockFetch = jest.mock('rn-fetch-blob', () => ({
  fetch: jest.fn(() => ({
    uploadProgress: (callback: (sent: number, total: number) => void) => {
      callback(512, 1024);
      return {
        info: jest.fn(() => ({
          headers: { Etag: 'mock-etag' },
        })),
      };
    },
  })),
}));

jest.mock('rn-fetch-blob', () => ({
  fetch: mockFetch,
  config: jest.fn(() => ({
    fileCache: true,
    appendExt: jest.fn(),
  })),
  fs: {
    exists: jest.fn(),
    unlink: jest.fn(),
    mkdir: jest.fn(),
    mv: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'android',
  select: jest.fn((obj) => obj.android),
}));

jest.mock('../@inxt-js/lib/crypto', () => ({
  ripemd160: jest.fn(),
}));

jest.mock('react-native-create-thumbnail', () => ({
  createThumbnail: jest.fn(),
}));

jest.mock('react-native-pdf-thumbnail', () => ({
  default: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(),
}));

jest.mock('@internxt/sdk/dist/network/upload', () => ({
  uploadFile: jest.fn().mockResolvedValue('mock-file-id'),

  uploadMultipartFile: jest.fn().mockImplementation((network, cryptoLib, bucketId, mnemonic, filePath, options) => {
    if (options.signal && options.signal.aborted) {
      return Promise.reject(new Error('Upload cancelled by user'));
    }
    return Promise.resolve('mock-file-id');
  }),
}));

jest.mock('../services/drive/database/driveLocalDB', () => {
  return {
    DriveLocalDB: jest.fn().mockImplementation(() => ({
      init: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      addNewUpload: jest.fn().mockResolvedValue(undefined),
      updateUploadProgress: jest.fn().mockResolvedValue(undefined),
      removeUpload: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('NetworkFacade', () => {
  let networkFacade: NetworkFacade;
  const mockAppDetails = {
    clientName: 'test-client',
    clientVersion: '1.0.0',
  };

  const mockNetwork = {
    appDetails: mockAppDetails,
    auth: {
      bridgeUser: 'test-user',
      userId: 'test-id',
    },
    credentials: {
      username: 'test-username',
      password: 'test-password',
    },
    client: jest.fn(),
    startUpload: jest.fn(),
    finishUpload: jest.fn(),
    finishMultipartUpload: jest.fn(),
    getDownloadLinks: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockFilePath = '/test/file.txt';
  const mockBucketId = 'bucket123';
  const mockMnemonic = 'test test test test test test test test test test test test';
  const mockFileSize = 1024;
  const mockHash = 'mock-hash';

  beforeEach(() => {
    jest.clearAllMocks();
    networkFacade = new NetworkFacade(mockNetwork as unknown as Network);

    (RNFS.stat as jest.Mock).mockResolvedValue({ size: mockFileSize });
    (RNFS.hash as jest.Mock).mockResolvedValue('mock-sha256-hash');
    (RNFS.exists as jest.Mock).mockResolvedValue(true);
    (ripemd160 as jest.Mock).mockReturnValue({
      toString: () => mockHash,
    });
  });

  describe('upload', () => {
    it('should successfully upload a file', async () => {
      const progressCallback = jest.fn();
      const [uploadPromise] = await networkFacade.upload(mockBucketId, mockMnemonic, mockFilePath, {
        progress: progressCallback,
      });

      const fileId = await uploadPromise;

      expect(fileId).toBeTruthy();
      expect(RNFS.stat).toHaveBeenCalledWith(mockFilePath);
      expect(mockFetch).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle upload progress correctly', async () => {
      const progressCallback = jest.fn();
      const [uploadPromise] = await networkFacade.upload(mockBucketId, mockMnemonic, mockFilePath, {
        progress: progressCallback,
      });

      await uploadPromise;

      expect(progressCallback).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should clean up encrypted file after upload', async () => {
      const [uploadPromise] = await networkFacade.upload(mockBucketId, mockMnemonic, mockFilePath, {});

      await uploadPromise;

      expect(RNFS.unlink).toHaveBeenCalled();
    });
  });

  describe('uploadMultipart', () => {
    const mockOptions = {
      partSize: 100 * 1024 * 1024,
      uploadingCallback: jest.fn(),
    };

    it('should successfully upload a file in multiple parts', async () => {
      const fileId = await networkFacade.uploadMultipart(mockBucketId, mockMnemonic, mockFilePath, mockOptions);

      expect(fileId).toBeTruthy();
      expect(RNFS.stat).toHaveBeenCalledWith(mockFilePath);
      expect(fileId).toBe('mock-file-id');
      expect(mockOptions.uploadingCallback).toHaveBeenCalled();
    });

    it('should handle upload progress for each part', async () => {
      await networkFacade.uploadMultipart(mockBucketId, mockMnemonic, mockFilePath, mockOptions);

      expect(mockOptions.uploadingCallback).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should abort upload when signal is triggered', async () => {
      const abortController = new AbortController();
      const options = {
        ...mockOptions,
        signal: abortController.signal,
      };

      const uploadPromise = networkFacade.uploadMultipart(mockBucketId, mockMnemonic, mockFilePath, options);
      abortController.abort();

      await expect(uploadPromise).rejects.toThrow('Upload cancelled by user');
    });

    it('should clean up temporary files after upload', async () => {
      await networkFacade.uploadMultipart(mockBucketId, mockMnemonic, mockFilePath, mockOptions);

      expect(RNFS.unlink).toHaveBeenCalled();
    });

    it('should handle missing required parameters', async () => {
      await expect(networkFacade.uploadMultipart('', mockMnemonic, mockFilePath, mockOptions)).rejects.toThrow();
      await expect(networkFacade.uploadMultipart(mockBucketId, '', mockFilePath, mockOptions)).rejects.toThrow();
    });
  });
});
