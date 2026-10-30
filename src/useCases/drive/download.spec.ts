import AuthService from '@internxt-mobile/services/AuthService';
import { NotEnoughSpaceOnDeviceError } from '@internxt-mobile/services/common/filesystem/errors';
import drive from '@internxt-mobile/services/drive';
import { MAX_SIZE_TO_DOWNLOAD } from '@internxt-mobile/services/drive/constants';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { FocusedItem } from '@internxt-mobile/types/drive/item';
import { downloadFileToDevice, isFileTooLargeToDownload } from './download';

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: {
    file: {
      getDecryptedFilePath: jest.fn((uuid: string, name: string, type: string) => `/tmp/${uuid}/${name}.${type}`),
      existsDecrypted: jest.fn().mockResolvedValue(false),
      createDecryptedFileFolder: jest.fn().mockResolvedValue(undefined),
      createEmptyDownloadedFile: jest.fn().mockResolvedValue(undefined),
      downloadFile: jest.fn().mockResolvedValue({ downloadPath: '/downloads/report.pdf' }),
    },
  },
}));
jest.mock('@internxt-mobile/services/AuthService', () => ({
  __esModule: true,
  default: { getAuthCredentials: jest.fn() },
}));
jest.mock('@internxt-mobile/services/FileSystemService', () => ({
  __esModule: true,
  default: { checkAvailableStorage: jest.fn().mockResolvedValue(true) },
}));
jest.mock('@internxt-mobile/services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));

const TEST_USER = { mnemonic: 'test mnemonic', userId: 'user-1', bridgeUser: 'bridge-user' };
const FILE_SIZE_BYTES = 2048;

const reportFile: NonNullable<FocusedItem> = {
  uuid: 'file-1',
  name: 'report',
  type: 'pdf',
  size: FILE_SIZE_BYTES,
  fileId: 'network-file-1',
  bucket: 'bucket-1',
  isFolder: false,
  updatedAt: '2026-10-29T10:00:00.000Z',
};

describe('Downloading a file to the device', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(AuthService.getAuthCredentials).mockResolvedValue({ credentials: { user: TEST_USER } } as never);
  });

  test('when the file is already decrypted on the device, then it is reused without downloading it again', async () => {
    jest.mocked(drive.file.existsDecrypted).mockResolvedValueOnce(true);
    const onDownloadStarted = jest.fn();

    const filePath = await downloadFileToDevice({ file: reportFile, onDownloadStarted });

    expect(filePath).toBe('/tmp/file-1/report.pdf');
    expect(drive.file.downloadFile).not.toHaveBeenCalled();
    expect(onDownloadStarted).not.toHaveBeenCalled();
    expect(drive.file.createDecryptedFileFolder).not.toHaveBeenCalled();
  });

  test('when the file is not on the device yet, then its own folder is created before downloading it', async () => {
    jest.mocked(fileSystemService.checkAvailableStorage).mockResolvedValueOnce(true);

    await downloadFileToDevice({ file: reportFile });

    expect(drive.file.existsDecrypted).toHaveBeenCalledWith('file-1', 'report', 'pdf');
    expect(drive.file.createDecryptedFileFolder).toHaveBeenCalledWith('file-1');
    expect(jest.mocked(drive.file.createDecryptedFileFolder).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(drive.file.downloadFile).mock.invocationCallOrder[0],
    );
  });

  test('when the device has no room for the file, then no folder is left behind', async () => {
    jest.mocked(fileSystemService.checkAvailableStorage).mockResolvedValueOnce(false);

    await expect(downloadFileToDevice({ file: reportFile })).rejects.toBeInstanceOf(NotEnoughSpaceOnDeviceError);

    expect(drive.file.createDecryptedFileFolder).not.toHaveBeenCalled();
  });

  test('when the file is empty, then an empty file is created instead of downloading it', async () => {
    const emptyFile = { ...reportFile, size: 0 };

    const filePath = await downloadFileToDevice({ file: emptyFile });

    expect(drive.file.createDecryptedFileFolder).toHaveBeenCalledWith('file-1');
    expect(drive.file.createEmptyDownloadedFile).toHaveBeenCalledWith('/tmp/file-1/report.pdf');
    expect(drive.file.downloadFile).not.toHaveBeenCalled();
    expect(filePath).toBe('/tmp/file-1/report.pdf');
  });

  test('when the file is not on the device, then it is downloaded and its progress is reported', async () => {
    const onDownloadStarted = jest.fn();
    const onProgress = jest.fn();

    const filePath = await downloadFileToDevice({ file: reportFile, onDownloadStarted, onProgress });

    expect(onDownloadStarted).toHaveBeenCalledTimes(1);
    expect(drive.file.downloadFile).toHaveBeenCalledWith(
      TEST_USER,
      'bucket-1',
      'network-file-1',
      expect.objectContaining({ downloadPath: '/tmp/file-1/report.pdf', downloadProgressCallback: onProgress }),
      FILE_SIZE_BYTES,
    );
    expect(filePath).toBe('/downloads/report.pdf');
  });

  test('when the device has no room for the file, then it is not downloaded and the failure says so', async () => {
    jest.mocked(fileSystemService.checkAvailableStorage).mockResolvedValueOnce(false);

    await expect(downloadFileToDevice({ file: reportFile })).rejects.toBeInstanceOf(NotEnoughSpaceOnDeviceError);
    expect(drive.file.downloadFile).not.toHaveBeenCalled();
  });

  test('when the free space cannot be checked, then the file is still downloaded', async () => {
    jest.mocked(fileSystemService.checkAvailableStorage).mockRejectedValueOnce(new Error('no file system info'));

    await downloadFileToDevice({ file: reportFile });

    expect(drive.file.downloadFile).toHaveBeenCalledTimes(1);
  });

  test('when an empty file has no network id, then an empty file is still created', async () => {
    const emptyFileWithoutNetworkId = { ...reportFile, size: 0, fileId: undefined };

    await downloadFileToDevice({ file: emptyFileWithoutNetworkId });

    expect(drive.file.createEmptyDownloadedFile).toHaveBeenCalledWith('/tmp/file-1/report.pdf');
  });

  test('when a non-empty file has no bucket, then the download fails', async () => {
    const fileWithoutBucket = { ...reportFile, bucket: undefined };

    await expect(downloadFileToDevice({ file: fileWithoutBucket })).rejects.toThrow();
    expect(drive.file.downloadFile).not.toHaveBeenCalled();
  });

  test('when a non-empty file has no network id, then the download fails', async () => {
    const fileWithoutNetworkId = { ...reportFile, fileId: undefined };

    await expect(downloadFileToDevice({ file: fileWithoutNetworkId })).rejects.toThrow();
    expect(drive.file.downloadFile).not.toHaveBeenCalled();
  });
});

describe('Checking the download size limit', () => {
  test('when a file is bigger than the limit, then it is too large to download', () => {
    const largeFile = { ...reportFile, size: MAX_SIZE_TO_DOWNLOAD['10GB'] + 1 };

    expect(isFileTooLargeToDownload(largeFile)).toBe(true);
  });

  test('when a file is within the limit, then it can be downloaded', () => {
    expect(isFileTooLargeToDownload(reportFile)).toBe(false);
  });
});
