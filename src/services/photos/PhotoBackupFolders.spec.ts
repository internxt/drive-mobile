import { createFolderWithMerge } from 'src/services/drive/folder/folderOrchestration.service';
import { photoBackupFolders } from './PhotoBackupFolders';

jest.mock('src/services/AsyncStorageService', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn().mockResolvedValue({ rootFolderId: 'root-uuid' }),
  },
}));

jest.mock('src/services/drive/folder/folderOrchestration.service', () => ({
  createFolderWithMerge: jest.fn(),
}));

const mockCreateFolder = createFolderWithMerge as jest.Mock;

const DEVICE_ID = 'device-123';

beforeEach(() => {
  jest.clearAllMocks();
  photoBackupFolders.clearCache();
  mockCreateFolder
    .mockResolvedValueOnce('photos-root-uuid')
    .mockResolvedValueOnce('device-uuid')
    .mockResolvedValueOnce('year-uuid')
    .mockResolvedValueOnce('month-uuid')
    .mockResolvedValueOnce('day-uuid');
});

describe('PhotoBackupFolders.getOrCreateFolderForDate', () => {
  test('when called for a date, then creates the full folder hierarchy and returns the day folder uuid', async () => {
    const uuid = await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));
    expect(uuid).toBe('day-uuid');
    expect(mockCreateFolder).toHaveBeenCalledTimes(5);

    // Verify the folder names at each level of the hierarchy
    const calls = mockCreateFolder.mock.calls;
    // 1st call: Photos root folder, parent is user root
    expect(calls[0][0]).toBe('root-uuid');
    expect(calls[0][1]).toBe('Photos Backup');
    // 2nd call: device folder under photos root
    expect(calls[1][1]).toBe(DEVICE_ID);
    expect(calls[1][0]).toBe('photos-root-uuid');
    // 3rd call: year folder under device folder
    expect(calls[2][1]).toBe('2024');
    expect(calls[2][0]).toBe('device-uuid');
    // 4th call: month folder under year folder
    expect(calls[3][1]).toBe('06');
    expect(calls[3][0]).toBe('year-uuid');
    // 5th call: day folder under month folder
    expect(calls[4][1]).toBe('15');
    expect(calls[4][0]).toBe('month-uuid');
  });

  test('when called twice for the same date, then creates folders only once', async () => {
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));

    expect(mockCreateFolder).toHaveBeenCalledTimes(5);
  });

  test('when called for two dates in the same month, then the month folder is created only once', async () => {
    mockCreateFolder
      .mockReset()
      .mockResolvedValueOnce('photos-root-uuid')
      .mockResolvedValueOnce('device-uuid')
      .mockResolvedValueOnce('year-uuid')
      .mockResolvedValueOnce('month-uuid')
      .mockResolvedValueOnce('day-15-uuid')
      .mockResolvedValueOnce('day-20-uuid');

    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-20'));

    const folderNames = mockCreateFolder.mock.calls.map((call) => call[1]);
    const monthCalls = folderNames.filter((name) => name === '06');
    expect(monthCalls).toHaveLength(1);
    expect(mockCreateFolder).toHaveBeenCalledTimes(6);
  });

  test('when called for two dates in different years, then separate year folders are created', async () => {
    mockCreateFolder
      .mockReset()
      .mockResolvedValueOnce('photos-root-uuid')
      .mockResolvedValueOnce('device-uuid')
      .mockResolvedValueOnce('year-2023-uuid')
      .mockResolvedValueOnce('month-uuid')
      .mockResolvedValueOnce('day-uuid')
      .mockResolvedValueOnce('year-2024-uuid')
      .mockResolvedValueOnce('month-uuid-2')
      .mockResolvedValueOnce('day-uuid-2');

    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2023-06-15'));
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));

    const folderNames = mockCreateFolder.mock.calls.map((call) => call[1]);
    expect(folderNames.filter((name) => name === '2023')).toHaveLength(1);
    expect(folderNames.filter((name) => name === '2024')).toHaveLength(1);
  });

  test('when the cache is cleared and called again, then folders are created from scratch', async () => {
    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));
    const callsAfterFirst = mockCreateFolder.mock.calls.length;

    photoBackupFolders.clearCache();
    mockCreateFolder
      .mockResolvedValueOnce('photos-root-uuid')
      .mockResolvedValueOnce('device-uuid')
      .mockResolvedValueOnce('year-uuid')
      .mockResolvedValueOnce('month-uuid')
      .mockResolvedValueOnce('day-uuid');

    await photoBackupFolders.getOrCreateFolderForDate(DEVICE_ID, new Date('2024-06-15'));
    expect(mockCreateFolder).toHaveBeenCalledTimes(callsAfterFirst * 2);
  });
});
