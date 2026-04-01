import { FolderTooLargeError, folderTraversalService } from './folderTraversal.service';

const mockReadDir = jest.fn();
const mockAlert = jest.fn();
const mockReadDirectoryAsync = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock('@dr.pogodin/react-native-fs', () => ({
  readDir: (...args: unknown[]) => mockReadDir(...args),
}));

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  },
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

jest.mock('react-native', () => ({
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
}));

jest.mock('../../../../assets/lang/strings', () => ({
  __esModule: true,
  default: {
    errors: {
      folderTooLarge: {
        title: 'Folder is too large',
        message: 'The selected folder contains more than {0} files. Please select a smaller folder.',
      },
    },
    formatString: (template: string, ...args: (string | number)[]) =>
      template.replaceAll(/{(\d+)}/g, (match, index) => {
        const argIndex = Number.parseInt(index, 10);
        return args[argIndex] !== undefined ? String(args[argIndex]) : match;
      }),
  },
}));

const mockFile = (name: string, path: string, size = 1024) => ({
  name,
  path,
  size,
  isFile: () => true,
  isDirectory: () => false,
});

const mockDir = (name: string, path: string) => ({
  name,
  path,
  size: 0,
  isFile: () => false,
  isDirectory: () => true,
});

describe('folderTraversalService.traverseFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the URI uses the file:// scheme', () => {
    it('when the folder is empty, then it returns empty dirs and files arrays', async () => {
      mockReadDir.mockResolvedValue([]);

      const result = await folderTraversalService.traverseFolder('file:///var/mobile/Photos');

      expect(result).toEqual({ dirs: [], files: [] });
    });

    it('when the folder contains only files, then it returns them with correct relativePath and parentPath', async () => {
      mockReadDir.mockResolvedValue([
        mockFile('photo1.jpg', '/var/mobile/Photos/photo1.jpg', 2048),
        mockFile('photo2.jpg', '/var/mobile/Photos/photo2.jpg', 3072),
      ]);

      const result = await folderTraversalService.traverseFolder('file:///var/mobile/Photos');

      expect(result.dirs).toEqual([]);
      expect(result.files).toEqual([
        {
          relativePath: 'photo1.jpg',
          parentPath: '',
          name: 'photo1.jpg',
          isDirectory: false,
          size: 2048,
          uri: 'file:///var/mobile/Photos/photo1.jpg',
        },
        {
          relativePath: 'photo2.jpg',
          parentPath: '',
          name: 'photo2.jpg',
          isDirectory: false,
          size: 3072,
          uri: 'file:///var/mobile/Photos/photo2.jpg',
        },
      ]);
    });

    it('when the folder has nested subdirectories, then it traverses all levels in DFS pre-order with correct relativePath and parentPath', async () => {
      const root = '/var/mobile/Root';

      mockReadDir.mockImplementation((path: string) => {
        if (path === root) {
          return Promise.resolve([mockDir('level1', `${root}/level1`), mockFile('root.txt', `${root}/root.txt`, 100)]);
        }
        if (path === `${root}/level1`) {
          return Promise.resolve([
            mockDir('level2', `${root}/level1/level2`),
            mockFile('l1.txt', `${root}/level1/l1.txt`, 200),
          ]);
        }
        if (path === `${root}/level1/level2`) {
          return Promise.resolve([mockFile('deep.txt', `${root}/level1/level2/deep.txt`, 300)]);
        }
        return Promise.resolve([]);
      });

      const result = await folderTraversalService.traverseFolder(`file://${root}`);

      expect(result.dirs).toEqual([
        {
          relativePath: 'level1',
          parentPath: '',
          name: 'level1',
          isDirectory: true,
          size: 0,
          uri: `file://${root}/level1`,
        },
        {
          relativePath: 'level1/level2',
          parentPath: 'level1',
          name: 'level2',
          isDirectory: true,
          size: 0,
          uri: `file://${root}/level1/level2`,
        },
      ]);

      expect(result.files).toEqual([
        {
          relativePath: 'level1/level2/deep.txt',
          parentPath: 'level1/level2',
          name: 'deep.txt',
          isDirectory: false,
          size: 300,
          uri: `file://${root}/level1/level2/deep.txt`,
        },
        {
          relativePath: 'level1/l1.txt',
          parentPath: 'level1',
          name: 'l1.txt',
          isDirectory: false,
          size: 200,
          uri: `file://${root}/level1/l1.txt`,
        },
        {
          relativePath: 'root.txt',
          parentPath: '',
          name: 'root.txt',
          isDirectory: false,
          size: 100,
          uri: `file://${root}/root.txt`,
        },
      ]);
    });

    it('when the folder contains more than 3000 files, then it throws FolderTooLargeError and shows an alert', async () => {
      const files = Array.from({ length: 3001 }, (_, i) => mockFile(`file${i}.txt`, `/var/mobile/Big/file${i}.txt`));
      mockReadDir.mockResolvedValue(files);

      await expect(folderTraversalService.traverseFolder('file:///var/mobile/Big')).rejects.toBeInstanceOf(
        FolderTooLargeError,
      );
      expect(mockAlert).toHaveBeenCalledWith(
        'Folder is too large',
        `The selected folder contains more than ${(3000).toLocaleString()} files. Please select a smaller folder.`,
      );
    });

    it('when the folder contains exactly 3000 files, then it resolves without throwing', async () => {
      const files = Array.from({ length: 3000 }, (_, i) => mockFile(`file${i}.txt`, `/var/mobile/Big/file${i}.txt`));
      mockReadDir.mockResolvedValue(files);

      const result = await folderTraversalService.traverseFolder('file:///var/mobile/Big');

      expect(result.files).toHaveLength(3000);
      expect(result.dirs).toHaveLength(0);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('when the root path contains percent-encoded characters, then it decodes them before reading', async () => {
      mockReadDir.mockResolvedValue([mockFile('a.txt', '/var/mobile/My Folder/a.txt', 10)]);

      const result = await folderTraversalService.traverseFolder('file:///var/mobile/My%20Folder');

      expect(result.files[0].relativePath).toBe('a.txt');
      expect(result.files[0].parentPath).toBe('');
      expect(result.files[0].uri).toBe('file:///var/mobile/My Folder/a.txt');
    });
  });

  describe('when the URI uses the content:// scheme', () => {
    const treeUri = 'content://com.android.externalstorage.documents/tree/primary%3ADownload';

    const safFileUri = (name: string) => `${treeUri}/document/primary%3ADownload%2F${encodeURIComponent(name)}`;
    const safDirUri = (name: string) => `${treeUri}/document/primary%3ADownload%2F${encodeURIComponent(name)}`;
    const safNestedUri = (dir: string, name: string) =>
      `${treeUri}/document/primary%3ADownload%2F${encodeURIComponent(dir)}%2F${encodeURIComponent(name)}`;

    const infoFile = (uri: string, size = 1024) => ({ exists: true as const, isDirectory: false, size, uri, modificationTime: 0 });
    const infoDir = (uri: string) => ({ exists: true as const, isDirectory: true, size: 0, uri, modificationTime: 0 });

    it('when the folder is empty, then it returns empty dirs and files arrays', async () => {
      mockReadDirectoryAsync.mockResolvedValue([]);

      const result = await folderTraversalService.traverseFolder(treeUri);

      expect(result).toEqual({ dirs: [], files: [] });
    });

    it('when the folder contains only files, then it returns them with correct relativePath and parentPath', async () => {
      const uri1 = safFileUri('photo1.jpg');
      const uri2 = safFileUri('photo2.jpg');

      mockReadDirectoryAsync.mockResolvedValue([uri1, uri2]);
      mockGetInfoAsync.mockImplementation((uri: string) => {
        if (uri === uri1) return Promise.resolve(infoFile(uri1, 2048));
        if (uri === uri2) return Promise.resolve(infoFile(uri2, 3072));
      });

      const result = await folderTraversalService.traverseFolder(treeUri);

      expect(result.dirs).toEqual([]);
      expect(result.files).toEqual([
        { relativePath: 'photo1.jpg', parentPath: '', name: 'photo1.jpg', isDirectory: false, size: 2048, uri: uri1 },
        { relativePath: 'photo2.jpg', parentPath: '', name: 'photo2.jpg', isDirectory: false, size: 3072, uri: uri2 },
      ]);
    });

    it('when the folder has nested subdirectories, then it traverses all levels in DFS pre-order with correct relativePath and parentPath', async () => {
      const level1Uri = safDirUri('level1');
      const deepTxtUri = safNestedUri('level1', 'deep.txt');
      const rootTxtUri = safFileUri('root.txt');

      mockReadDirectoryAsync.mockImplementation((uri: string) => {
        if (uri === treeUri) return Promise.resolve([level1Uri, rootTxtUri]);
        if (uri === level1Uri) return Promise.resolve([deepTxtUri]);
        return Promise.resolve([]);
      });
      mockGetInfoAsync.mockImplementation((uri: string) => {
        if (uri === level1Uri) return Promise.resolve(infoDir(level1Uri));
        if (uri === deepTxtUri) return Promise.resolve(infoFile(deepTxtUri, 300));
        if (uri === rootTxtUri) return Promise.resolve(infoFile(rootTxtUri, 100));
      });

      const result = await folderTraversalService.traverseFolder(treeUri);

      expect(result.dirs).toEqual([
        { relativePath: 'level1', parentPath: '', name: 'level1', isDirectory: true, size: 0, uri: level1Uri },
      ]);
      expect(result.files).toEqual([
        { relativePath: 'level1/deep.txt', parentPath: 'level1', name: 'deep.txt', isDirectory: false, size: 300, uri: deepTxtUri },
        { relativePath: 'root.txt', parentPath: '', name: 'root.txt', isDirectory: false, size: 100, uri: rootTxtUri },
      ]);
    });

    it('when the document URI contains percent-encoded characters in the name, then it decodes them correctly', async () => {
      const uri = safFileUri('my file.txt');

      mockReadDirectoryAsync.mockResolvedValue([uri]);
      mockGetInfoAsync.mockResolvedValue(infoFile(uri, 512));

      const result = await folderTraversalService.traverseFolder(treeUri);

      expect(result.files[0].name).toBe('my file.txt');
      expect(result.files[0].relativePath).toBe('my file.txt');
    });

    it('when the folder contains more than 3000 files, then it throws FolderTooLargeError and shows an alert', async () => {
      const uris = Array.from({ length: 3001 }, (_, i) => safFileUri(`file${i}.txt`));
      mockReadDirectoryAsync.mockResolvedValue(uris);
      mockGetInfoAsync.mockImplementation((uri: string) => Promise.resolve(infoFile(uri)));

      await expect(folderTraversalService.traverseFolder(treeUri)).rejects.toBeInstanceOf(FolderTooLargeError);
      expect(mockAlert).toHaveBeenCalledWith(
        'Folder is too large',
        `The selected folder contains more than ${(3000).toLocaleString()} files. Please select a smaller folder.`,
      );
    });

    it('when the folder contains exactly 3000 files, then it resolves without throwing', async () => {
      const uris = Array.from({ length: 3000 }, (_, i) => safFileUri(`file${i}.txt`));
      mockReadDirectoryAsync.mockResolvedValue(uris);
      mockGetInfoAsync.mockImplementation((uri: string) => Promise.resolve(infoFile(uri)));

      const result = await folderTraversalService.traverseFolder(treeUri);

      expect(result.files).toHaveLength(3000);
      expect(result.dirs).toHaveLength(0);
      expect(mockAlert).not.toHaveBeenCalled();
    });
  });

  describe('when the URI uses an unsupported scheme', () => {
    it('when traverseFolder is called, then it throws an unsupported scheme error', async () => {
      await expect(folderTraversalService.traverseFolder('ftp://example.com/folder')).rejects.toThrow(
        'Unsupported URI scheme',
      );
    });
  });
});
