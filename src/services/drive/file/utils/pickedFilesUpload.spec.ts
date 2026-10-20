import { DocumentPickerResponse, keepLocalCopy } from '@react-native-documents/picker';
import fileSystemService from '../../../FileSystemService';
import notificationsService from '../../../NotificationsService';
import { preparePickedFilesForUpload } from './pickedFilesUpload';

jest.mock('@react-native-documents/picker', () => ({ keepLocalCopy: jest.fn() }));
jest.mock('../../../FileSystemService', () => ({ __esModule: true, default: { getFileInfo: jest.fn() } }));
jest.mock('../../../NotificationsService', () => ({ __esModule: true, default: { show: jest.fn() } }));
jest.mock('../../../common', () => ({ logger: { warn: jest.fn() } }));

const mockKeepLocalCopy = keepLocalCopy as jest.Mock;
const mockGetFileInfo = fileSystemService.getFileInfo as jest.Mock;
const mockShowNotification = notificationsService.show as jest.Mock;

const makePickedFile = (overrides: Partial<DocumentPickerResponse> = {}): DocumentPickerResponse =>
  ({
    uri: 'file:///picked/document.pdf',
    name: 'document.pdf',
    size: 1024,
    type: 'application/pdf',
    error: null,
    nativeType: null,
    isVirtual: null,
    convertibleToMimeTypes: null,
    hasRequestedType: true,
    ...overrides,
  }) as DocumentPickerResponse;

const copiedTo = (pickedFile: DocumentPickerResponse, localUri: string) => ({
  status: 'success',
  sourceUri: pickedFile.uri,
  localUri,
});

describe('preparing picked files for upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when the picker could not read a file, then it is left out and the user is warned', async () => {
    const unreadableFile = makePickedFile({ name: null, size: null, error: 'The file could not be read' });

    const filesToUpload = await preparePickedFilesForUpload([unreadableFile]);

    expect(filesToUpload).toEqual([]);
    expect(mockKeepLocalCopy).not.toHaveBeenCalled();
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });

  test('when the picker gives no size, then the size of the local copy is used', async () => {
    const pickedFile = makePickedFile({ size: null });
    mockKeepLocalCopy.mockResolvedValue([copiedTo(pickedFile, 'file:///cache/document.pdf')]);
    mockGetFileInfo.mockReturnValue({ exists: true, size: 20480 });

    const filesToUpload = await preparePickedFilesForUpload([pickedFile]);

    expect(filesToUpload).toEqual([
      { uri: 'file:///cache/document.pdf', name: 'document.pdf', size: 20480, type: 'application/pdf' },
    ]);
    expect(mockShowNotification).not.toHaveBeenCalled();
  });

  test('when the picker gives no size and the local copy is empty, then the file is kept as empty', async () => {
    const pickedFile = makePickedFile({ size: null });
    mockKeepLocalCopy.mockResolvedValue([copiedTo(pickedFile, 'file:///cache/document.pdf')]);
    mockGetFileInfo.mockReturnValue({ exists: true, size: 0 });

    const filesToUpload = await preparePickedFilesForUpload([pickedFile]);

    expect(filesToUpload).toHaveLength(1);
    expect(filesToUpload[0].size).toBe(0);
  });

  test('when no size can be read for a file, then it is left out and the user is warned', async () => {
    const pickedFile = makePickedFile({ size: null });
    mockKeepLocalCopy.mockResolvedValue([copiedTo(pickedFile, 'file:///cache/document.pdf')]);
    mockGetFileInfo.mockImplementation(() => {
      throw new Error('The file could not be read');
    });

    const filesToUpload = await preparePickedFilesForUpload([pickedFile]);

    expect(filesToUpload).toEqual([]);
    expect(mockShowNotification).toHaveBeenCalledTimes(1);
  });

  test('when the local copy fails, then the file keeps its original location', async () => {
    const pickedFile = makePickedFile();
    mockKeepLocalCopy.mockResolvedValue([
      { status: 'error', sourceUri: pickedFile.uri, copyError: 'The copy could not be created' },
    ]);

    const filesToUpload = await preparePickedFilesForUpload([pickedFile]);

    expect(filesToUpload).toEqual([
      { uri: 'file:///picked/document.pdf', name: 'document.pdf', size: 1024, type: 'application/pdf' },
    ]);
  });
});
