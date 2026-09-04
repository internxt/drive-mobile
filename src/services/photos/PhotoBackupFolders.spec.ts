import { createFolderWithMerge } from 'src/services/drive/folder/folderOrchestration.service';
import { photoBackupFolders } from './PhotoBackupFolders';

jest.mock('src/services/drive/folder/folderOrchestration.service', () => ({
  createFolderWithMerge: jest.fn(),
}));

const mockCreateFolder = createFolderWithMerge as jest.Mock;

const DEVICE_FOLDER_UUID = 'device-folder-uuid';

beforeEach(() => {
  jest.clearAllMocks();
  photoBackupFolders.clearCache();
  mockCreateFolder
    .mockResolvedValueOnce('year-uuid')
    .mockResolvedValueOnce('month-uuid')
    .mockResolvedValueOnce('day-uuid');
});

describe('PhotoBackupFolders.getOrCreateFolderForDate', () => {
  test('when called for a date, then creates year / month / day folders under the device folder and returns the day uuid', async () => {
    const uuid = await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));

    expect(uuid).toBe('day-uuid');
    expect(mockCreateFolder).toHaveBeenCalledTimes(3);

    const calls = mockCreateFolder.mock.calls;
    // Year folder directly under the device folder
    expect(calls[0][0]).toBe(DEVICE_FOLDER_UUID);
    expect(calls[0][1]).toBe('2024');
    // Month folder under year
    expect(calls[1][0]).toBe('year-uuid');
    expect(calls[1][1]).toBe('06');
    // Day folder under month
    expect(calls[2][0]).toBe('month-uuid');
    expect(calls[2][1]).toBe('15');
  });

  test('when called twice for the same date, then folders are created only once', async () => {
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));

    expect(mockCreateFolder).toHaveBeenCalledTimes(3);
  });

  test('when called for two dates in the same month, then the month folder is created only once', async () => {
    mockCreateFolder
      .mockReset()
      .mockResolvedValueOnce('year-uuid')
      .mockResolvedValueOnce('month-uuid')
      .mockResolvedValueOnce('day-15-uuid')
      .mockResolvedValueOnce('day-20-uuid');

    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-20'));

    const folderNames = mockCreateFolder.mock.calls.map((call) => call[1]);
    expect(folderNames.filter((name) => name === '06')).toHaveLength(1);
    expect(mockCreateFolder).toHaveBeenCalledTimes(4);
  });

  test('when called for two dates in different years, then separate year folders are created', async () => {
    mockCreateFolder
      .mockReset()
      .mockResolvedValueOnce('year-2023-uuid')
      .mockResolvedValueOnce('month-uuid')
      .mockResolvedValueOnce('day-uuid')
      .mockResolvedValueOnce('year-2024-uuid')
      .mockResolvedValueOnce('month-uuid-2')
      .mockResolvedValueOnce('day-uuid-2');

    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2023-06-15'));
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));

    const folderNames = mockCreateFolder.mock.calls.map((call) => call[1]);
    expect(folderNames.filter((name) => name === '2023')).toHaveLength(1);
    expect(folderNames.filter((name) => name === '2024')).toHaveLength(1);
  });

  test('when the cache is cleared and called again, then folders are created from scratch', async () => {
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));
    const callsAfterFirst = mockCreateFolder.mock.calls.length;

    photoBackupFolders.clearCache();
    mockCreateFolder
      .mockResolvedValueOnce('year-uuid')
      .mockResolvedValueOnce('month-uuid')
      .mockResolvedValueOnce('day-uuid');

    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_FOLDER_UUID, new Date('2024-06-15'));
    expect(mockCreateFolder).toHaveBeenCalledTimes(callsAfterFirst * 2);
  });
});
