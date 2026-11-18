import { driveRecentsService } from './driveRecents.service';

const mockGetRecentFilesV2 = jest.fn();

jest.mock('@internxt-mobile/services/common', () => ({
  SdkManager: {
    getInstance: () => ({ storageV2: { getRecentFilesV2: (limit: number) => mockGetRecentFilesV2(limit) } }),
  },
}));

describe('Loading the recent files', () => {
  test('when a recent file only has an extension, then it keeps its empty name instead of the old one', async () => {
    mockGetRecentFilesV2.mockResolvedValue([
      { uuid: 'file-1', plainName: '', plain_name: '', name: 'old file name', type: 'dockerfile' },
    ]);

    const recentFiles = await driveRecentsService.getRecents();

    expect(recentFiles[0].plainName).toBe('');
    expect(recentFiles[0].isFolder).toBe(false);
  });
});
