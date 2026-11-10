const mockSdkDownloadFile = jest.fn();
const mockRnfsDownloadFile = jest.fn();
const mockStopDownload = jest.fn();
const mockIsCached = jest.fn();

jest.mock('@internxt/sdk/dist/network/download', () => ({
  downloadFile: (...args: unknown[]) => mockSdkDownloadFile(...args),
}));

jest.mock('@dr.pogodin/react-native-fs', () => ({
  downloadFile: (...args: unknown[]) => mockRnfsDownloadFile(...args),
  stopDownload: (...args: unknown[]) => mockStopDownload(...args),
  readDir: jest.fn().mockResolvedValue([]),
}));

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: {
    cache: {
      isCached: (...args: unknown[]) => mockIsCached(...args),
      removeCachedFile: jest.fn(),
    },
  },
}));

jest.mock('../services/FileSystemService', () => ({
  __esModule: true,
  default: {
    tmpFilePath: (fileName: string) => `/tmp/${fileName}`,
    getTemporaryDir: () => '/tmp/',
    createEmptyFile: jest.fn().mockResolvedValue(undefined),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(false),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('../services/AppService', () => ({
  __esModule: true,
  default: { name: 'drive-mobile', version: '1.0.0' },
}));

jest.mock('../services/drive/events', () => ({
  driveEvents: { setJobId: jest.fn() },
}));

jest.mock('react-native-crypto', () => ({
  randomBytes: jest.fn(),
}));

jest.mock('./crypto', () => ({
  generateFileKey: jest.fn(),
}));

jest.mock('../@inxt-js/lib/crypto', () => ({
  ripemd160: jest.fn(),
}));

import drive from '@internxt-mobile/services/drive';
import { Network } from '@internxt/sdk/dist/network';
import { NetworkFacade } from './NetworkFacade';

const MEGA_BYTE = 1024 * 1024;
const CHUNK_SIZE = 25 * MEGA_BYTE;
const CONCURRENT_CHUNKS = 6;
const CHUNK_COUNT = 8;
const FILE_SIZE = CHUNK_SIZE * CHUNK_COUNT;

const deferred = <T>() => {
  const handle = {
    resolve: jest.fn() as (value: T) => void,
    reject: jest.fn() as (error: Error) => void,
  };
  const promise = new Promise<T>((resolve, reject) => {
    handle.resolve = resolve;
    handle.reject = reject;
  });
  return { promise, ...handle };
};

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const downloadParams = {
  toPath: '/documents/report.pdf',
  downloadProgressCallback: jest.fn(),
  decryptionProgressCallback: jest.fn(),
};

const startDownload = () =>
  new NetworkFacade({} as Network).downloadMultipart('file-id', 'bucket-id', 'mnemonic', downloadParams, FILE_SIZE);

describe('Cancelling a multipart download', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSdkDownloadFile.mockImplementation(
      async (
        _fileId: string,
        _bucketId: string,
        _mnemonic: string,
        _network: unknown,
        _crypto: unknown,
        _toBinaryData: unknown,
        downloadStep: (downloadables: { url: string; hash: string }[]) => Promise<void>,
      ) => {
        await downloadStep([{ url: 'https://farmer/file', hash: 'hash' }]);
      },
    );
  });

  test('when the user cancels before the file parts start downloading, then none of them starts', async () => {
    const cacheLookup = deferred<{ isCached: boolean; path?: string }>();
    mockIsCached.mockReturnValue(cacheLookup.promise);

    const [downloadPromise, abortDownload] = startDownload();
    await abortDownload();
    cacheLookup.resolve({ isCached: false });

    await expect(downloadPromise).rejects.toThrow('Download aborted');
    expect(mockRnfsDownloadFile).not.toHaveBeenCalled();
  });

  test('when the user cancels and the file was already cached, then the cached copy is kept', async () => {
    const cacheLookup = deferred<{ isCached: boolean; path?: string }>();
    mockIsCached.mockReturnValue(cacheLookup.promise);

    const [downloadPromise, abortDownload] = startDownload();
    await abortDownload();
    cacheLookup.resolve({ isCached: true, path: '/cache/file-id.enc' });

    await expect(downloadPromise).rejects.toThrow('Download aborted');
    expect(drive.cache.removeCachedFile).not.toHaveBeenCalled();
  });

  test('when the user cancels while some file parts are still waiting their turn, then those never start', async () => {
    mockIsCached.mockResolvedValue({ isCached: false });
    const runningParts: ReturnType<typeof deferred<unknown>>[] = [];
    mockRnfsDownloadFile.mockImplementation(() => {
      const part = deferred<unknown>();
      runningParts.push(part);
      return { jobId: runningParts.length, promise: part.promise };
    });

    const [downloadPromise, abortDownload] = startDownload();
    await flushPromises();
    expect(mockRnfsDownloadFile).toHaveBeenCalledTimes(CONCURRENT_CHUNKS);

    await abortDownload();
    runningParts.forEach((part) => part.reject(new Error('Download stopped')));

    await expect(downloadPromise).rejects.toThrow('Download aborted');
    await flushPromises();
    expect(mockRnfsDownloadFile).toHaveBeenCalledTimes(CONCURRENT_CHUNKS);
    expect(mockStopDownload).toHaveBeenCalledTimes(CONCURRENT_CHUNKS);
  });
});
