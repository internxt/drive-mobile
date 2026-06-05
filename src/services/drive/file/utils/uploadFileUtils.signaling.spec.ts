import { Action } from 'redux';
import { Dispatch } from 'react';
import { UploadingFile } from '../../../../types/drive/operations';

const mockNotifyParentChanged = jest.fn().mockResolvedValue(undefined);

// Sibling modules not exercised by `uploadSingleFile` but pulling in heavy native/network
// chains at import time — stubbed so the unit under test loads in isolation.
jest.mock('./checkDuplicatedFiles', () => ({ checkDuplicatedFiles: jest.fn() }));
jest.mock('./prepareFilesToUpload', () => ({ prepareFilesToUpload: jest.fn() }));
jest.mock('../../../common/network/upload/upload.service', () => ({
  uploadService: { createFileEntry: jest.fn(), uploadFile: jest.fn() },
}));

jest.mock('../../../../store/slices/drive', () => ({
  driveActions: {
    uploadFileStart: jest.fn(),
    uploadFileFailed: jest.fn(),
    uploadFileFinished: jest.fn(),
  },
}));

jest.mock('../../../native/InternxtSignalingModule', () => ({
  notifyParentChanged: (...args: unknown[]) => mockNotifyParentChanged(...args),
}));

jest.mock('../../../ErrorService', () => ({
  __esModule: true,
  default: { reportError: jest.fn(), castError: (e: Error) => e },
}));

jest.mock('../../../AnalyticsService', () => ({
  __esModule: true,
  default: { track: jest.fn() },
  DriveAnalyticsEvent: {},
}));

jest.mock('../../../common', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

import { uploadSingleFile } from './uploadFileUtils';

const buildUploadingFile = (overrides: Partial<UploadingFile> = {}): UploadingFile => ({
  id: 1,
  uuid: 'file-uuid',
  uri: 'file:///tmp/file.txt',
  name: 'file.txt',
  type: 'txt',
  parentId: 10,
  parentUuid: 'destination-folder-uuid',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
  size: 1024,
  progress: 0,
  uploaded: false,
  ...overrides,
});

describe('uploadSingleFile — picker signaling', () => {
  const dispatch = jest.fn() as unknown as Dispatch<Action>;

  beforeEach(() => {
    mockNotifyParentChanged.mockClear();
  });

  it('when a file upload succeeds, then it signals the destination folder uuid', async () => {
    // given
    const file = buildUploadingFile({ parentUuid: 'destination-folder-uuid' });
    const uploadFile = jest.fn().mockResolvedValue(undefined);
    const uploadSuccess = jest.fn();

    // when
    await uploadSingleFile(file, dispatch, uploadFile, uploadSuccess);

    // then
    expect(mockNotifyParentChanged).toHaveBeenCalledWith('destination-folder-uuid');
  });

  it('when the file upload fails, then it does not signal the file picker', async () => {
    // given
    const file = buildUploadingFile();
    const uploadFile = jest.fn().mockRejectedValue(new Error('network down'));
    const uploadSuccess = jest.fn();

    // when
    await expect(uploadSingleFile(file, dispatch, uploadFile, uploadSuccess)).rejects.toThrow('network down');

    // then
    expect(mockNotifyParentChanged).not.toHaveBeenCalled();
  });
});
