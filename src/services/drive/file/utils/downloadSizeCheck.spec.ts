import { logger } from '@internxt-mobile/services/common';
import prettysize from 'prettysize';

import { NotificationType } from '../../../../types';
import fileSystemService from '../../../FileSystemService';
import notificationsService from '../../../NotificationsService';
import { LARGE_DOWNLOAD_WARNING_BYTES, MAX_SIZE_TO_DOWNLOAD } from '../../constants';
import { checkDownloadSize, isDownloadBlocked, notifyDownloadSizeCheck } from './downloadSizeCheck';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  DocumentDirectoryPath: '/documents',
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../FileSystemService', () => ({
  __esModule: true,
  default: { checkAvailableStorage: jest.fn() },
}));

jest.mock('../../../NotificationsService', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

const ONE_MEGABYTE = 1024 * 1024;
const DOWNLOAD_COPY_COUNT = 2;
const SMALL_FILE_SIZE = ONE_MEGABYTE;
const LARGE_FILE_SIZE = LARGE_DOWNLOAD_WARNING_BYTES + ONE_MEGABYTE;
const TOO_LARGE_FILE_SIZE = MAX_SIZE_TO_DOWNLOAD['10GB'] + ONE_MEGABYTE;

const mockedCheckAvailableStorage = jest.mocked(fileSystemService.checkAvailableStorage);
const mockedShowNotification = jest.mocked(notificationsService.show);
const mockedLogWarning = jest.mocked(logger.warn);

describe('checking a file before downloading it', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCheckAvailableStorage.mockResolvedValue(true);
  });

  test('when a small file fits on the device, then it is downloaded without any notice', async () => {
    const downloadSizeCheck = await checkDownloadSize(SMALL_FILE_SIZE);

    expect(downloadSizeCheck).toBe('allowed');
    expect(isDownloadBlocked(downloadSizeCheck)).toBe(false);
  });

  test('when the file is exactly at the warning size, then it is downloaded without any notice', async () => {
    expect(await checkDownloadSize(LARGE_DOWNLOAD_WARNING_BYTES)).toBe('allowed');
  });

  test('when the file is above the warning size, then it is downloaded with a notice', async () => {
    const downloadSizeCheck = await checkDownloadSize(LARGE_FILE_SIZE);

    expect(downloadSizeCheck).toBe('large');
    expect(isDownloadBlocked(downloadSizeCheck)).toBe(false);
  });

  test('when the file is exactly at the mobile download limit, then it is downloaded with a notice', async () => {
    expect(await checkDownloadSize(MAX_SIZE_TO_DOWNLOAD['10GB'])).toBe('large');
  });

  test('when the file is above the mobile download limit, then it is not downloaded and the free space is not read', async () => {
    const downloadSizeCheck = await checkDownloadSize(TOO_LARGE_FILE_SIZE);

    expect(downloadSizeCheck).toBe('tooLarge');
    expect(isDownloadBlocked(downloadSizeCheck)).toBe(true);
    expect(mockedCheckAvailableStorage).not.toHaveBeenCalled();
  });

  test('when the device lacks space for the file, then it is not downloaded', async () => {
    mockedCheckAvailableStorage.mockResolvedValue(false);

    const downloadSizeCheck = await checkDownloadSize(LARGE_FILE_SIZE);

    expect(downloadSizeCheck).toBe('notEnoughSpace');
    expect(isDownloadBlocked(downloadSizeCheck)).toBe(true);
  });

  test('when the free space is checked, then room for the encrypted and the decrypted copies is asked for', async () => {
    await checkDownloadSize(SMALL_FILE_SIZE);

    expect(mockedCheckAvailableStorage).toHaveBeenCalledWith(SMALL_FILE_SIZE * DOWNLOAD_COPY_COUNT);
  });

  test('when the free space cannot be read, then the file is downloaded', async () => {
    mockedCheckAvailableStorage.mockRejectedValue(new Error('Could not check available storage'));

    expect(await checkDownloadSize(SMALL_FILE_SIZE)).toBe('allowed');
  });
});

describe('telling the user about a file size before downloading it', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the file needs no notice, then nothing is shown', () => {
    notifyDownloadSizeCheck('allowed', LARGE_FILE_SIZE);

    expect(mockedShowNotification).not.toHaveBeenCalled();
  });

  test('when the file is large, then a warning that stays on screen long enough to read is shown', () => {
    notifyDownloadSizeCheck('large', LARGE_FILE_SIZE);

    expect(mockedShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.Warning,
        text1: expect.stringContaining(prettysize(LARGE_DOWNLOAD_WARNING_BYTES)),
        visibilityTime: expect.any(Number),
      }),
    );
    expect(mockedShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ text1: expect.not.stringContaining('{0}') }),
    );
  });

  test('when the file is above the mobile download limit, then a warning pointing to the other platforms is shown', () => {
    notifyDownloadSizeCheck('tooLarge', TOO_LARGE_FILE_SIZE);

    expect(mockedShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.Warning,
        text1: expect.stringContaining(prettysize(MAX_SIZE_TO_DOWNLOAD['10GB'])),
      }),
    );
    expect(mockedShowNotification).toHaveBeenCalledWith(
      expect.objectContaining({ text1: expect.stringContaining('drive.internxt.com') }),
    );
  });

  test('when the device lacks space, then an error is shown', () => {
    notifyDownloadSizeCheck('notEnoughSpace', LARGE_FILE_SIZE);

    expect(mockedShowNotification).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.Error }));
  });

  test.each([
    { reason: 'the file is too large', downloadSizeCheck: 'tooLarge' as const },
    { reason: 'the device lacks space', downloadSizeCheck: 'notEnoughSpace' as const },
  ])(
    'when a download is blocked because $reason, then the reason and the file size are logged',
    ({ downloadSizeCheck }) => {
      notifyDownloadSizeCheck(downloadSizeCheck, TOO_LARGE_FILE_SIZE);

      expect(mockedLogWarning).toHaveBeenCalledWith(expect.stringContaining(downloadSizeCheck));
      expect(mockedLogWarning).toHaveBeenCalledWith(expect.stringContaining(String(TOO_LARGE_FILE_SIZE)));
    },
  );

  test('when a download goes ahead, then nothing is logged', () => {
    notifyDownloadSizeCheck('large', LARGE_FILE_SIZE);

    expect(mockedLogWarning).not.toHaveBeenCalled();
  });
});
