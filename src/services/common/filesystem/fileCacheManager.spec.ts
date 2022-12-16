import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { ReadDirItem } from 'react-native-fs';
import { FileCacheManagerConfigError, FileDoesntExistsError } from './errors';
import { FileCacheManager, FileCacheManagerConfig } from './fileCacheManager';

jest.mock('@internxt-mobile/services/FileSystemService', () => {
  return {
    exists: jest.fn(),
    readDir: jest.fn(),
    getDirSize: jest.fn(),
    statRNFS: jest.fn(),
    moveFile: jest.fn(),
    touch: jest.fn(),
    unlinkIfExists: jest.fn(),
  };
});

const mockedFs = jest.mocked(fileSystemService);
const fileCacheManagerFactory = (config?: Partial<FileCacheManagerConfig>) =>
  new FileCacheManager({
    directory: '/cache',
    maxFileSizeToCacheInBytes: 1024 * 1024 * 50,
    maxSpaceInBytes: 1024 * 1024 * 500,
    ...config,
  });
describe('File Cache Manager', () => {
  describe('When initializing the file cache manager', () => {
    let sut: FileCacheManager = fileCacheManagerFactory();
    beforeEach(() => {
      sut = fileCacheManagerFactory();
      jest.restoreAllMocks();
    });
    it('Should fail if the cache manager is not initialized', async () => {
      try {
        await sut.cacheFile('/non_cached', 'hi.png');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(FileCacheManagerConfigError);
      }
    });

    it('Should fail if the directory does not exists', async () => {
      mockedFs.exists.mockImplementationOnce(async () => false);
      mockedFs.getDirSize.mockImplementationOnce(async () => 1);
      try {
        await sut.init();
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(FileDoesntExistsError);
      }
    });
  });

  describe('When caching a file', () => {
    let sut: FileCacheManager = fileCacheManagerFactory();
    beforeEach(() => {
      sut = fileCacheManagerFactory();
      jest.restoreAllMocks();
    });
    it('Should not cache the file if the size is bigger than the max allowed', async () => {
      mockedFs.exists.mockImplementation(async () => true);
      await sut.init();
      mockedFs.statRNFS.mockImplementationOnce(async () => ({
        // 100MB
        size: 1024 * 1024 * 100,
        name: 'hi.png',
        ctime: Date.now(),
        mtime: Date.now(),
        mode: 0,
        path: '/non_cached/hi.png',
        originalFilepath: '/non_cached/hi.png',
        isFile: () => true,
        isDirectory: () => false,
      }));
      const { cached } = await sut.cacheFile('/non_cached', 'hi.png');

      expect(cached).toBe(false);
    });

    it('Should cache the file if the size is less than the max size allowed', async () => {
      // Return true when smoke testing
      mockedFs.exists.mockImplementationOnce(async () => true);
      await sut.init();
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => false);

      mockedFs.statRNFS.mockImplementationOnce(async () => ({
        // 10MB
        size: 1024 * 1024 * 10,
        name: 'hi.png',
        ctime: Date.now(),
        mtime: Date.now(),
        mode: 0,
        path: '/non_cached/hi.png',
        originalFilepath: '/non_cached/hi.png',
        isFile: () => true,
        isDirectory: () => false,
      }));
      const { cached } = await sut.cacheFile('/non_cached', 'hi.png');

      expect(cached).toBe(true);
    });

    it('Should touch the file mtime if the cached file already exists', async () => {
      // Return true when smoke testing
      mockedFs.exists.mockImplementationOnce(async () => true);
      await sut.init();
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);

      mockedFs.statRNFS.mockImplementationOnce(async () => ({
        // 10MB
        size: 1024 * 1024 * 10,
        name: 'hi.png',
        ctime: Date.now(),
        mtime: Date.now(),
        mode: 0,
        path: '/non_cached/hi.png',
        originalFilepath: '/non_cached/hi.png',
        isFile: () => true,
        isDirectory: () => false,
      }));

      const { cached } = await sut.cacheFile('/non_cached', 'hi.png');
      expect(mockedFs.touch).toBeCalled();
      expect(cached).toBe(true);
    });

    it('Should remove files in the directory by the oldest mtime if not enough space', async () => {
      // Total 90MB
      const itemsInDir: ReadDirItem[] = [
        {
          name: 'file_1.png',
          ctime: new Date('2022/12/01'),
          mtime: new Date('2022/12/01'),
          path: '/cached/file_1.png',
          size: 1024 * 1024 * 30,
          isFile: () => true,
          isDirectory: () => false,
        },
        {
          name: 'file_2.png',
          ctime: new Date('2022/11/10'),
          mtime: new Date('2022/11/10'),
          path: '/cached/file_2.png',
          size: 1024 * 1024 * 20,
          isFile: () => true,
          isDirectory: () => false,
        },
        {
          name: 'file_3.png',
          ctime: new Date('2022/11/25'),
          mtime: new Date('2022/11/25'),
          path: '/cached/file_3.png',
          size: 1024 * 1024 * 40,
          isFile: () => true,
          isDirectory: () => false,
        },
      ];
      mockedFs.readDir.mockImplementationOnce(async () => itemsInDir);
      mockedFs.getDirSize.mockImplementationOnce(async () =>
        itemsInDir.reduce<number>((prev, curr) => prev + curr.size, 0),
      );

      mockedFs.unlinkIfExists.mockImplementation(async () => true);

      const sut = fileCacheManagerFactory({
        // 100MB
        maxSpaceInBytes: 1024 * 1024 * 100,
        // 50MB
        maxFileSizeToCacheInBytes: 1024 * 1024 * 50,
      });
      // Return true when smoke testing
      mockedFs.exists.mockImplementationOnce(async () => true);
      await sut.init();
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => true);
      mockedFs.exists.mockImplementationOnce(async () => false);
      mockedFs.exists.mockImplementationOnce(async () => true);

      // We will need to free 40MB at least to fit this file
      mockedFs.statRNFS.mockImplementationOnce(async () => ({
        // 50MB
        size: 1024 * 1024 * 50,
        name: 'hi.png',
        ctime: Date.now(),
        mtime: Date.now(),
        mode: 0,
        path: '/non_cached/hi.png',
        originalFilepath: '/non_cached/hi.png',
        isFile: () => true,
        isDirectory: () => false,
      }));

      const { cached } = await sut.cacheFile('/non_cached', 'hi.png');
      expect(mockedFs.unlinkIfExists).toBeCalledWith('/cached/file_2.png');
      expect(mockedFs.unlinkIfExists).toBeCalledWith('/cached/file_3.png');

      expect(cached).toBe(true);
    });
  });
});
