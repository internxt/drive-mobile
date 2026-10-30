const mockDownloadFileToDevice = jest.fn();
const mockIsFileTooLargeToDownload = jest.fn();
const mockMoveToAndroidDownloads = jest.fn();
const mockSaveFilesToiOSFiles = jest.fn();
const mockShareFiles = jest.fn();
const mockNotifySuccess = jest.fn();
const mockNotifyError = jest.fn();
const mockReportError = jest.fn();

jest.mock('@internxt-mobile/useCases/drive', () => ({
  downloadFileToDevice: (...args: unknown[]) => mockDownloadFileToDevice(...args),
  isFileTooLargeToDownload: (...args: unknown[]) => mockIsFileTooLargeToDownload(...args),
}));

jest.mock('@internxt-mobile/services/FileSystemService', () => ({
  fs: {
    moveToAndroidDownloads: (...args: unknown[]) => mockMoveToAndroidDownloads(...args),
    saveFilesToiOSFiles: (...args: unknown[]) => mockSaveFilesToiOSFiles(...args),
    shareFiles: (...args: unknown[]) => mockShareFiles(...args),
  },
}));

jest.mock('@internxt-mobile/services/NotificationsService', () => ({
  notifications: {
    success: (...args: unknown[]) => mockNotifySuccess(...args),
    error: (...args: unknown[]) => mockNotifyError(...args),
  },
}));

jest.mock('@internxt-mobile/services/ErrorService', () => ({
  __esModule: true,
  default: { reportError: (...args: unknown[]) => mockReportError(...args) },
}));

import { NotEnoughSpaceOnDeviceError } from '@internxt-mobile/services/common/filesystem/errors';
import { DriveItemStatus, DriveListItem } from '@internxt-mobile/types/drive/item';
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useFetchSelectedFiles } from './useFetchSelectedFiles';

const buildFileItem = (uuid: string, name: string): DriveListItem => ({
  id: uuid,
  status: DriveItemStatus.Idle,
  data: {
    uuid,
    name,
    type: 'pdf',
    size: 1024,
    createdAt: '2025-02-16T00:00:00.000Z',
    updatedAt: '2025-02-16T00:00:00.000Z',
    isFolder: false,
  },
});

const REPORT_FILE = buildFileItem('file-1', 'report');
const INVOICE_FILE = buildFileItem('file-2', 'invoice');
const NOTES_FILE = buildFileItem('file-3', 'notes');

const renderDownloadHook = () => {
  const onFinished = jest.fn();
  const { result } = renderHook(() => useFetchSelectedFiles({ onFinished }));
  return { result, onFinished };
};

const setPlatform = (platform: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { value: platform, configurable: true });
};

const deferNextDownload = () => {
  const download = {
    finish: jest.fn() as (filePath: string) => void,
    fail: jest.fn() as (error: Error) => void,
  };
  mockDownloadFileToDevice.mockImplementationOnce(
    () =>
      new Promise((resolve, reject) => {
        download.finish = resolve;
        download.fail = reject;
      }),
  );
  return download;
};

const USER_ABORT_ERROR = new Error('User requested abort');

describe('Downloading the selected Drive files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('android');
    mockIsFileTooLargeToDownload.mockReturnValue(false);
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => `/tmp/${file.name}.pdf`);
  });

  test('when every file is downloaded on Android, then each one goes to Downloads and selection mode ends', async () => {
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockMoveToAndroidDownloads).toHaveBeenNthCalledWith(1, '/tmp/report.pdf');
    expect(mockMoveToAndroidDownloads).toHaveBeenNthCalledWith(2, '/tmp/invoice.pdf');
    expect(mockNotifySuccess).toHaveBeenCalledWith('2 files downloaded');
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(result.current.isDownloading).toBe(false);
  });

  test('when every file is downloaded on iOS, then a single save to Files sheet opens with all of them', async () => {
    setPlatform('ios');
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockSaveFilesToiOSFiles).toHaveBeenCalledTimes(1);
    expect(mockSaveFilesToiOSFiles).toHaveBeenCalledWith(['/tmp/report.pdf', '/tmp/invoice.pdf']);
    expect(mockMoveToAndroidDownloads).not.toHaveBeenCalled();
  });

  test('when one file fails, then the others are still downloaded and the notification names it', async () => {
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => {
      if (file.uuid === 'file-2') {
        throw new Error('network');
      }
      return `/tmp/${file.name}.pdf`;
    });
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE, NOTES_FILE]);
    });

    expect(mockMoveToAndroidDownloads).toHaveBeenCalledTimes(2);
    expect(mockNotifyError).toHaveBeenCalledWith('"invoice.pdf" could not be downloaded');
    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  test('when several files fail, then the notification counts the downloaded and the failed ones', async () => {
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => {
      if (file.uuid !== 'file-1') {
        throw new Error('network');
      }
      return `/tmp/${file.name}.pdf`;
    });
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE, NOTES_FILE]);
    });

    expect(mockNotifyError).toHaveBeenCalledWith('1 downloaded, 2 could not be downloaded');
  });

  test('when a file is bigger than the download limit, then it counts as failed without being downloaded', async () => {
    mockIsFileTooLargeToDownload.mockImplementation((file) => file.uuid === 'file-1');
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockDownloadFileToDevice).toHaveBeenCalledTimes(1);
    expect(mockNotifyError).toHaveBeenCalledWith('"report.pdf" could not be downloaded');
    expect(mockReportError).not.toHaveBeenCalled();
  });

  test('when the user cancels, then the current download stops, the next ones never start and nothing is shown', async () => {
    const abortCurrentDownload = jest.fn();
    let rejectCurrentDownload: (error: Error) => void = jest.fn();
    mockDownloadFileToDevice.mockImplementationOnce(({ onAbortableReady }) => {
      onAbortableReady(abortCurrentDownload);
      return new Promise((_resolve, reject) => {
        rejectCurrentDownload = reject;
      });
    });
    const { result, onFinished } = renderDownloadHook();

    let downloadInProgress: Promise<void> = Promise.resolve();
    act(() => {
      downloadInProgress = result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });
    await act(async () => {
      result.current.cancelDownload();
      rejectCurrentDownload(USER_ABORT_ERROR);
      await downloadInProgress;
    });

    expect(abortCurrentDownload).toHaveBeenCalledTimes(1);
    expect(mockDownloadFileToDevice).toHaveBeenCalledTimes(1);
    expect(mockNotifyError).not.toHaveBeenCalled();
    expect(mockReportError).not.toHaveBeenCalled();
    expect(mockNotifySuccess).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
    expect(result.current.isDownloading).toBe(false);
  });

  test('when a single file is downloaded, then the notification is in singular', async () => {
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE]);
    });

    expect(mockNotifySuccess).toHaveBeenCalledWith('File downloaded correctly');
  });

  test('when there is no room on the device, then the user is told so and nothing is reported', async () => {
    mockDownloadFileToDevice.mockRejectedValue(new NotEnoughSpaceOnDeviceError('no space'));
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockNotifyError).toHaveBeenCalledWith('Not enough storage space available for download');
    expect(mockReportError).not.toHaveBeenCalled();
  });

  test('when every file fails on iOS, then no save sheet opens and the selection stays', async () => {
    setPlatform('ios');
    mockDownloadFileToDevice.mockRejectedValue(new Error('network'));
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockSaveFilesToiOSFiles).not.toHaveBeenCalled();
    expect(mockNotifyError).toHaveBeenCalledWith('2 files could not be downloaded');
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when some files fail on iOS, then the save sheet only carries the downloaded ones', async () => {
    setPlatform('ios');
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => {
      if (file.uuid === 'file-2') {
        throw new Error('network');
      }
      return `/tmp/${file.name}.pdf`;
    });
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockSaveFilesToiOSFiles).toHaveBeenCalledWith(['/tmp/report.pdf']);
  });

  test('when the user closes the save sheet on iOS, then nothing is shown or reported and selection mode ends', async () => {
    setPlatform('ios');
    mockSaveFilesToiOSFiles.mockRejectedValue({ code: 'CANCELLED' });
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE]);
    });

    expect(mockReportError).not.toHaveBeenCalled();
    expect(mockNotifySuccess).not.toHaveBeenCalled();
    expect(mockNotifyError).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test('when the user closes the save sheet after some files failed, then only the failure is shown', async () => {
    setPlatform('ios');
    mockSaveFilesToiOSFiles.mockRejectedValue({ code: 'CANCELLED' });
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => {
      if (file.uuid === 'file-2') {
        throw new Error('network');
      }
      return `/tmp/${file.name}.pdf`;
    });
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockNotifyError).toHaveBeenCalledWith('"invoice.pdf" could not be downloaded');
    expect(mockNotifySuccess).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test('when the save sheet fails on iOS, then it is reported and the selection stays', async () => {
    setPlatform('ios');
    mockSaveFilesToiOSFiles.mockRejectedValue(new Error('sheet failed'));
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE]);
    });

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockNotifyError).toHaveBeenCalledWith('The files could not be saved');
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when the user cancels just as a file starts, then its download is aborted as soon as it can be', async () => {
    const abortStartingDownload = jest.fn();
    let startDownload: () => void = jest.fn();
    mockDownloadFileToDevice.mockImplementationOnce(
      ({ onAbortableReady }) =>
        new Promise((_resolve, reject) => {
          startDownload = () => {
            onAbortableReady(abortStartingDownload);
            reject(USER_ABORT_ERROR);
          };
        }),
    );
    const { result, onFinished } = renderDownloadHook();

    let downloadInProgress: Promise<void> = Promise.resolve();
    act(() => {
      downloadInProgress = result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });
    await act(async () => {
      result.current.cancelDownload();
      startDownload();
      await downloadInProgress;
    });

    expect(abortStartingDownload).toHaveBeenCalledTimes(1);
    expect(mockDownloadFileToDevice).toHaveBeenCalledTimes(1);
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when a file is downloading, then its name and the bytes received are available to show', async () => {
    let reportProgress: (progress: number, bytesReceived: number, totalBytes: number) => void = jest.fn();
    let finishDownload: (path: string) => void = jest.fn();
    mockDownloadFileToDevice.mockImplementationOnce(({ onProgress }) => {
      reportProgress = onProgress;
      return new Promise((resolve) => {
        finishDownload = resolve;
      });
    });
    const { result } = renderDownloadHook();

    let downloadInProgress: Promise<void> = Promise.resolve();
    act(() => {
      downloadInProgress = result.current.downloadItems([REPORT_FILE]);
    });
    act(() => {
      reportProgress(0.25, 256, 1024);
    });

    expect(result.current.isDownloading).toBe(true);
    expect(result.current.downloadProgress).toMatchObject({
      currentFile: REPORT_FILE.data,
      currentFileProgress: 0.25,
      currentFileBytesReceived: 256,
      currentFileTotalBytes: 1024,
    });

    await act(async () => {
      finishDownload('/tmp/report.pdf');
      await downloadInProgress;
    });
  });

  test('when a file finishes, then its progress stays complete while the selection is closing', async () => {
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.downloadItems([REPORT_FILE]);
    });

    expect(result.current.isDownloading).toBe(false);
    expect(result.current.downloadProgress).toMatchObject({
      currentFileProgress: 1,
      currentFileBytesReceived: 1024,
      currentFileTotalBytes: 1024,
      isCurrentFileComplete: true,
    });
  });

  test('when the user cancels and then downloads the same selection again, then the files are downloaded', async () => {
    const download = deferNextDownload();
    const { result, onFinished } = renderDownloadHook();

    let downloadInProgress: Promise<void> = Promise.resolve();
    act(() => {
      downloadInProgress = result.current.downloadItems([REPORT_FILE]);
    });
    await act(async () => {
      result.current.cancelDownload();
      download.fail(USER_ABORT_ERROR);
      await downloadInProgress;
    });
    await act(async () => {
      await result.current.downloadItems([REPORT_FILE]);
    });

    expect(mockMoveToAndroidDownloads).toHaveBeenCalledWith('/tmp/report.pdf');
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test('when the user cancels just as a file finishes, then the next file never starts and nothing is shown', async () => {
    const download = deferNextDownload();
    const { result, onFinished } = renderDownloadHook();

    let downloadInProgress: Promise<void> = Promise.resolve();
    act(() => {
      downloadInProgress = result.current.downloadItems([REPORT_FILE, INVOICE_FILE]);
    });
    await act(async () => {
      result.current.cancelDownload();
      download.finish('/tmp/report.pdf');
      await downloadInProgress;
    });

    expect(mockDownloadFileToDevice).toHaveBeenCalledTimes(1);
    expect(mockNotifySuccess).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when the download is pressed twice, then the files are only downloaded once', async () => {
    const { result } = renderDownloadHook();

    await act(async () => {
      await Promise.all([result.current.downloadItems([REPORT_FILE]), result.current.downloadItems([REPORT_FILE])]);
    });

    expect(mockDownloadFileToDevice).toHaveBeenCalledTimes(1);
  });
});

describe('Exporting the selected Drive files', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('android');
    mockIsFileTooLargeToDownload.mockReturnValue(false);
    mockShareFiles.mockResolvedValue(undefined);
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => `/tmp/${file.name}.pdf`);
  });

  test('when every file is ready, then a single share sheet opens and nothing goes to Downloads', async () => {
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.exportItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockShareFiles).toHaveBeenCalledTimes(1);
    expect(mockShareFiles).toHaveBeenCalledWith(['/tmp/report.pdf', '/tmp/invoice.pdf']);
    expect(mockMoveToAndroidDownloads).not.toHaveBeenCalled();
    expect(mockNotifySuccess).not.toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  test('when one file fails, then the others are shared and the notification names it', async () => {
    mockDownloadFileToDevice.mockImplementation(async ({ file }) => {
      if (file.uuid === 'file-2') {
        throw new Error('network');
      }
      return `/tmp/${file.name}.pdf`;
    });
    const { result } = renderDownloadHook();

    await act(async () => {
      await result.current.exportItems([REPORT_FILE, INVOICE_FILE]);
    });

    expect(mockShareFiles).toHaveBeenCalledWith(['/tmp/report.pdf']);
    expect(mockNotifyError).toHaveBeenCalledWith('"invoice.pdf" could not be downloaded');
  });

  test('when every file fails, then no share sheet opens and the selection stays', async () => {
    mockDownloadFileToDevice.mockRejectedValue(new Error('network'));
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.exportItems([REPORT_FILE]);
    });

    expect(mockShareFiles).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
    expect(mockNotifyError).toHaveBeenCalledWith('"report.pdf" could not be downloaded');
  });

  test('when the user cancels while the files are being prepared, then no share sheet opens and the selection stays', async () => {
    const download = deferNextDownload();
    const { result, onFinished } = renderDownloadHook();

    let exportInProgress: Promise<void> = Promise.resolve();
    act(() => {
      exportInProgress = result.current.exportItems([REPORT_FILE]);
    });
    await act(async () => {
      result.current.cancelDownload();
      download.fail(USER_ABORT_ERROR);
      await exportInProgress;
    });

    expect(mockShareFiles).not.toHaveBeenCalled();
    expect(mockReportError).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
  });

  test('when export is pressed again while the share sheet is open, then it is ignored and the progress stays visible', async () => {
    let closeShareSheet: () => void = jest.fn();
    mockShareFiles.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          closeShareSheet = resolve;
        }),
    );
    const { result } = renderDownloadHook();

    let exportInProgress: Promise<void> = Promise.resolve();
    await act(async () => {
      exportInProgress = result.current.exportItems([REPORT_FILE]);
    });
    expect(result.current.isDownloading).toBe(true);
    await act(async () => {
      await result.current.exportItems([REPORT_FILE]);
    });
    await act(async () => {
      closeShareSheet();
      await exportInProgress;
    });

    expect(mockDownloadFileToDevice).toHaveBeenCalledTimes(1);
    expect(result.current.isDownloading).toBe(false);
  });

  test('when the share sheet fails, then it is reported and the selection stays', async () => {
    mockShareFiles.mockRejectedValue(new Error('sheet failed'));
    const { result, onFinished } = renderDownloadHook();

    await act(async () => {
      await result.current.exportItems([REPORT_FILE]);
    });

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockNotifyError).toHaveBeenCalledWith('The files could not be shared');
    expect(onFinished).not.toHaveBeenCalled();
  });
});
