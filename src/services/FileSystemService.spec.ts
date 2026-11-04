import * as RNFS from '@dr.pogodin/react-native-fs';
import fileSystemService from './FileSystemService';

jest.mock('@dr.pogodin/react-native-fs', () => ({ getFSInfo: jest.fn() }));

const mockedGetFSInfo = RNFS.getFSInfo as jest.Mock;

const arrangeFreeSpace = (freeSpace: number) => {
  mockedGetFSInfo.mockResolvedValue({ freeSpace, totalSpace: freeSpace });
};

describe('FileSystemService.checkAvailableStorage', () => {
  beforeEach(() => {
    mockedGetFSInfo.mockReset();
  });

  test('when the free space is below size * multiplier, then checkAvailableStorage is false', async () => {
    arrangeFreeSpace(150);

    await expect(fileSystemService.checkAvailableStorage(100, 2)).resolves.toBe(false);
  });

  test('when the free space is greater than or equal to size * multiplier, then checkAvailableStorage is true', async () => {
    arrangeFreeSpace(250);

    await expect(fileSystemService.checkAvailableStorage(100, 2)).resolves.toBe(true);
  });

  test('when no multiplier is passed, then it keeps the 1.3 buffer for downloads/folder callers', async () => {
    arrangeFreeSpace(120);

    await expect(fileSystemService.checkAvailableStorage(100)).resolves.toBe(false);

    arrangeFreeSpace(130);
    await expect(fileSystemService.checkAvailableStorage(100)).resolves.toBe(true);
  });
});
