const mockCopyFile = jest.fn().mockResolvedValue(undefined);

jest.mock('@internxt-mobile/services/FileSystemService', () => ({
  __esModule: true,
  default: { copyFile: (...args: unknown[]) => mockCopyFile(...args) },
}));

jest.mock('./checkDuplicatedFiles', () => ({ checkDuplicatedFiles: jest.fn() }));
jest.mock('./prepareFilesToUpload', () => ({ prepareFilesToUpload: jest.fn() }));
jest.mock('../../../common/network/upload/upload.service', () => ({
  uploadService: { createFileEntry: jest.fn(), uploadFile: jest.fn() },
}));
jest.mock('../../../native/InternxtSignalingModule', () => ({ notifyParentChanged: jest.fn() }));
jest.mock('../../../../store/slices/drive', () => ({ driveActions: {} }));
jest.mock('../../../ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn(), castError: jest.fn() } }));
jest.mock('../../../AnalyticsService', () => ({ __esModule: true, default: { track: jest.fn() }, DriveAnalyticsEvent: {} }));
jest.mock('../../../common', () => ({ logger: { error: jest.fn(), info: jest.fn() } }));

import { copyFileFromEncodedUri } from './uploadFileUtils';

const DEST_PATH = 'file:///tmp/internxt/upload-target';

describe('copyFileFromEncodedUri', () => {
  beforeEach(() => {
    mockCopyFile.mockClear();
  });

  test('when the source uri is percent-encoded with accents and spaces, then it copies from the decoded path', async () => {
    const encodedUri = 'file:///cache/abc/N%C3%B3mina%2026_04.pdf';

    await copyFileFromEncodedUri(encodedUri, DEST_PATH);

    expect(mockCopyFile).toHaveBeenCalledWith('file:///cache/abc/Nómina 26_04.pdf', DEST_PATH);
  });

  test('when the source uri is a plain ascii path, then it copies it unchanged', async () => {
    const plainUri = 'file:///cache/abc/invoice.pdf';

    await copyFileFromEncodedUri(plainUri, DEST_PATH);

    expect(mockCopyFile).toHaveBeenCalledWith(plainUri, DEST_PATH);
  });

  test('when the source uri has a malformed percent sequence, then it falls back to the original path', async () => {
    const malformedUri = 'file:///cache/abc/100%discount.pdf';

    await copyFileFromEncodedUri(malformedUri, DEST_PATH);

    expect(mockCopyFile).toHaveBeenCalledWith(malformedUri, DEST_PATH);
  });
});
