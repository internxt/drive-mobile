import { Dispatch } from 'react';
import { Action } from 'redux';
import { UploadingFile } from '../../../../types/drive/operations';

const mockCheckAvailableStorage = jest.fn();
const mockReportError = jest.fn();
const mockCastError = jest.fn((error: Error) => error);

jest.mock('@internxt-mobile/services/FileSystemService', () => ({
  __esModule: true,
  default: { checkAvailableStorage: (...args: unknown[]) => mockCheckAvailableStorage(...args) },
}));

jest.mock('./checkDuplicatedFiles', () => ({ checkDuplicatedFiles: jest.fn() }));
jest.mock('./prepareFilesToUpload', () => ({ prepareFilesToUpload: jest.fn() }));
jest.mock('../../../common/network/upload/upload.service', () => ({
  uploadService: { createFileEntry: jest.fn(), uploadFile: jest.fn() },
}));

jest.mock('../../../../store/slices/drive', () => ({
  driveActions: {
    uploadFileStart: jest.fn(),
    uploadFileFailed: jest.fn((payload) => ({ type: 'uploadFileFailed', payload })),
    uploadFileFinished: jest.fn(() => ({ type: 'uploadFileFinished' })),
  },
}));

jest.mock('../../../../store/slices/ui', () => ({
  uiActions: {
    setShowNotEnoughDeviceSpaceModal: jest.fn((value) => ({ type: 'setShowNotEnoughDeviceSpaceModal', payload: value })),
    setShowEmptyFileNotAllowedModal: jest.fn((value) => ({ type: 'setShowEmptyFileNotAllowedModal', payload: value })),
    setFileSizeExceededMessage: jest.fn((value) => ({ type: 'setFileSizeExceededMessage', payload: value })),
  },
}));

jest.mock('../../../native/InternxtSignalingModule', () => ({ notifyParentChanged: jest.fn().mockResolvedValue(undefined) }));

jest.mock('../../../ErrorService', () => ({
  __esModule: true,
  default: { reportError: (...args: unknown[]) => mockReportError(...args), castError: (error: Error) => mockCastError(error) },
}));

jest.mock('../../../AnalyticsService', () => ({ __esModule: true, default: { track: jest.fn() }, DriveAnalyticsEvent: {} }));
jest.mock('../../../common', () => ({ logger: { error: jest.fn(), info: jest.fn() } }));

import { driveActions } from '../../../../store/slices/drive';
import { uiActions } from '../../../../store/slices/ui';
import { FileSizeExceededError } from './fileSizeErrors';
import { uploadSingleFile } from './uploadFileUtils';

const buildUploadingFile = (overrides: Partial<UploadingFile> = {}): UploadingFile => ({
  id: 1,
  uuid: 'file-uuid',
  uri: 'file:///tmp/file.txt',
  name: 'video.mov',
  type: 'mov',
  parentId: 10,
  parentUuid: 'destination-folder-uuid',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  size: 20 * 1024 * 1024,
  progress: 0,
  uploaded: false,
  ...overrides,
});

const arrange = ({ hasDeviceSpace = true }: { hasDeviceSpace?: boolean } = {}) => {
  mockCheckAvailableStorage.mockResolvedValue(hasDeviceSpace);
  return {
    file: buildUploadingFile(),
    dispatch: jest.fn() as unknown as Dispatch<Action>,
    uploadSuccess: jest.fn(),
  };
};

describe('uploadSingleFile — device storage handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when there is not enough device space, then it warns about storage and does not upload the file', async () => {
    const { file, dispatch, uploadSuccess } = arrange({ hasDeviceSpace: false });
    const uploadFile = jest.fn().mockResolvedValue(undefined);

    await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);

    expect(mockCheckAvailableStorage).toHaveBeenCalledWith(file.size, 2.2);
    expect(uiActions.setShowNotEnoughDeviceSpaceModal).toHaveBeenCalledWith(true);
    expect(uploadFile).not.toHaveBeenCalled();
  });

  test('when there is enough device space, then the upload proceeds normally', async () => {
    const { file, dispatch, uploadSuccess } = arrange({ hasDeviceSpace: true });
    const uploadFile = jest.fn().mockResolvedValue(undefined);

    await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);

    expect(uploadFile).toHaveBeenCalledWith(file, 'document');
    expect(uploadSuccess).toHaveBeenCalledWith(file);
    expect(uiActions.setShowNotEnoughDeviceSpaceModal).not.toHaveBeenCalled();
  });

  test('when the upload fails with a device I/O error, then it warns about storage instead of the generic error', async () => {
    const { file, dispatch, uploadSuccess } = arrange();
    const uploadFile = jest.fn().mockRejectedValue('Cannot convert argument of type class java.io.IOException');

    await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);

    expect(uiActions.setShowNotEnoughDeviceSpaceModal).toHaveBeenCalledWith(true);
    expect(driveActions.uploadFileFailed).not.toHaveBeenCalled();
  });

  test('when the upload fails with an I/O error, then the original native error is reported for diagnosis', async () => {
    const { file, dispatch, uploadSuccess } = arrange();
    const nativeError = 'ENOSPC: no space left on device';
    const uploadFile = jest.fn().mockRejectedValue(nativeError);

    await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);

    expect(mockReportError).toHaveBeenCalledWith(nativeError, { extra: { fileId: file.id } });
  });

  test('when the upload exceeds the plan limit, then it shows its size modal and not the storage one', async () => {
    const { file, dispatch, uploadSuccess } = arrange();
    const uploadFile = jest.fn().mockRejectedValue(new FileSizeExceededError());

    await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);

    expect(uiActions.setFileSizeExceededMessage).toHaveBeenCalled();
    expect(uiActions.setShowNotEnoughDeviceSpaceModal).not.toHaveBeenCalled();
  });

  test('when the upload fails with a non-I/O error, then it is mapped as a generic error as before', async () => {
    const { file, dispatch, uploadSuccess } = arrange();
    const networkError = new Error('Network request failed');
    const uploadFile = jest.fn().mockRejectedValue(networkError);

    await expect(uploadSingleFile(file, dispatch, uploadFile, uploadSuccess)).rejects.toThrow('Network request failed');

    expect(mockCastError).toHaveBeenCalledWith(networkError);
    expect(driveActions.uploadFileFailed).toHaveBeenCalled();
    expect(uiActions.setShowNotEnoughDeviceSpaceModal).not.toHaveBeenCalled();
  });
});
