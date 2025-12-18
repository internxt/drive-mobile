import { TrashItem } from '../services/drive/trash/driveTrash.service';
import { DriveItemData, DriveItemFocused } from '../types/drive';
import { checkIsFile, checkIsFolder, getFileSize, isEmptyFile } from './driveItems';

describe('Drive item classification', () => {
  describe('Identifying folders', () => {
    it('when an item has folder type, then it is recognized as a folder', () => {
      const folder: Partial<DriveItemData> = {
        id: 1,
        type: 'folder',
        name: 'My Folder',
      };

      expect(checkIsFolder(folder as DriveItemData)).toBe(true);
    });

    it('when an item has a parent folder reference, then it is recognized as a folder', () => {
      const folder: Partial<DriveItemData> = {
        id: 1,
        type: 'folder',
        name: 'My Folder',
        parentUuid: 'parent-uuid-123',
      };

      expect(checkIsFolder(folder as DriveItemData)).toBe(true);
    });

    it('when an item is a regular file, then it is not recognized as a folder', () => {
      const file: Partial<DriveItemData> = {
        id: 1,
        type: 'jpg',
        name: 'image.jpg',
        fileId: 'file-123',
        folderUuid: 'folder-uuid-456',
        size: 1024,
      };

      expect(checkIsFolder(file as DriveItemData)).toBe(false);
    });

    it('when an item is a file without extension, then it is not recognized as a folder', () => {
      const file = {
        id: 1,
        type: null,
        name: 'file-no-extension',
        fileId: 'file-123',
        folderUuid: 'folder-uuid-456',
        size: 512,
      } as unknown;

      expect(checkIsFolder(file as DriveItemData)).toBe(false);
    });

    it('when no item is provided, then it is not recognized as a folder', () => {
      expect(checkIsFolder(null as any)).toBe(false);
      expect(checkIsFolder(undefined as any)).toBe(false);
    });

    describe('Trashed items', () => {
      it('when a trashed item is a folder, then it is recognized as a folder', () => {
        const trashFolder = {
          id: 1,
          type: 'folder',
          name: 'Deleted Folder',
          parentUuid: 'parent-uuid',
        } as unknown;

        expect(checkIsFolder(trashFolder as TrashItem)).toBe(true);
      });

      it('when a trashed item is a file, then it is not recognized as a folder', () => {
        const trashFile: Partial<TrashItem> = {
          id: 1,
          type: 'pdf',
          name: 'document.pdf',
          folderUuid: 'folder-uuid',
        };

        expect(checkIsFolder(trashFile as TrashItem)).toBe(false);
      });
    });
  });

  describe('Detecting empty files', () => {
    it('when a file has zero bytes as number, then it is detected as empty', () => {
      const emptyFile: Partial<DriveItemData> = {
        id: 1,
        name: 'empty.bin',
        type: 'bin',
        size: 0,
      };

      expect(isEmptyFile(emptyFile as DriveItemData)).toBe(true);
    });

    it('when a file has zero bytes as string, then it is detected as empty', () => {
      const emptyFile = {
        id: 1,
        name: 'empty.bin',
        type: 'bin',
        size: '0',
      } as unknown;

      expect(isEmptyFile(emptyFile as DriveItemData)).toBe(true);
    });

    it('when a file has content, then it is not detected as empty', () => {
      const fileWithContent: Partial<DriveItemData> = {
        id: 1,
        name: 'document.pdf',
        type: 'pdf',
        size: 1024,
      };

      expect(isEmptyFile(fileWithContent as DriveItemData)).toBe(false);
    });

    it('when a file has content as string, then it is not detected as empty', () => {
      const fileWithContent = {
        id: 1,
        name: 'image.jpg',
        type: 'jpg',
        size: '2048',
      } as unknown;

      expect(isEmptyFile(fileWithContent as DriveItemData)).toBe(false);
    });

    it('when file size is not available, then it is not detected as empty', () => {
      const fileWithoutSize = {
        id: 1,
        name: 'file.txt',
        type: 'txt',
      } as DriveItemData;

      const fileWithNullSize = {
        id: 1,
        name: 'file.txt',
        type: 'txt',
        size: null,
      } as unknown as DriveItemData;

      expect(isEmptyFile(fileWithoutSize)).toBe(false);
      expect(isEmptyFile(fileWithNullSize)).toBe(false);
    });

    it('when no item is provided, then it is not detected as empty', () => {
      expect(isEmptyFile(null as any)).toBe(false);
    });

    it('when an item has no size information, then it is not detected as empty', () => {
      const item: any = {
        id: 1,
        name: 'item',
      };

      expect(isEmptyFile(item)).toBe(false);
    });
  });

  describe('Getting file size', () => {
    it('when file size is stored as number, then the numeric size is returned', () => {
      const file: Partial<DriveItemData> = {
        id: 1,
        name: 'file.txt',
        size: 1024,
      };

      expect(getFileSize(file as DriveItemData)).toBe(1024);
    });

    it('when file size is stored as string, then the numeric size is returned', () => {
      const file = {
        id: 1,
        name: 'file.txt',
        size: '2048',
      } as unknown;

      expect(getFileSize(file as DriveItemData)).toBe(2048);
    });

    it('when file has zero bytes as number, then zero is returned', () => {
      const file: Partial<DriveItemData> = {
        id: 1,
        name: 'empty.bin',
        size: 0,
      };

      expect(getFileSize(file as DriveItemData)).toBe(0);
    });

    it('when file has zero bytes as string, then zero is returned', () => {
      const file = {
        id: 1,
        name: 'empty.bin',
        size: '0',
      } as unknown;

      expect(getFileSize(file as DriveItemData)).toBe(0);
    });

    it('when file size is not available, then zero is returned', () => {
      const fileWithUndefinedSize = {
        id: 1,
        name: 'file.txt',
      } as DriveItemData;

      const fileWithNullSize = {
        id: 1,
        name: 'file.txt',
        size: null,
      } as unknown as DriveItemData;

      expect(getFileSize(fileWithUndefinedSize)).toBe(0);
      expect(getFileSize(fileWithNullSize)).toBe(0);
    });

    it('when no item is provided, then zero is returned', () => {
      expect(getFileSize(null as any)).toBe(0);
    });

    it('when an item has no size information, then zero is returned', () => {
      const item: any = {
        id: 1,
        name: 'item',
      };

      expect(getFileSize(item)).toBe(0);
    });

    it('when file is very large, then the correct size is returned', () => {
      const largeFile = {
        id: 1,
        name: 'large-file.bin',
        size: '2147483648',
      } as unknown;

      expect(getFileSize(largeFile as DriveItemData)).toBe(2147483648);
    });
  });

  describe('Identifying files', () => {
    it('when an item is a regular file, then it is recognized as a file', () => {
      const file: Partial<DriveItemData> = {
        id: 1,
        type: 'pdf',
        name: 'document.pdf',
        fileId: 'file-123',
        folderUuid: 'folder-uuid-456',
        size: 1024,
      };

      expect(checkIsFile(file as DriveItemData)).toBe(true);
    });

    it('when an item is a folder, then it is not recognized as a file', () => {
      const folder: Partial<DriveItemData> = {
        id: 1,
        type: 'folder',
        name: 'My Folder',
        parentUuid: 'parent-uuid-123',
      };

      expect(checkIsFile(folder as DriveItemData)).toBe(false);
    });

    it('when an item is an empty file, then it is recognized as a file', () => {
      const emptyFile: Partial<DriveItemData> = {
        id: 1,
        type: 'bin',
        name: 'empty-file.bin',
        folderUuid: 'folder-uuid-456',
        size: 0,
      };

      expect(checkIsFile(emptyFile as DriveItemData)).toBe(true);
    });

    it('when an item is a file without extension, then it is recognized as a file', () => {
      const file = {
        id: 1,
        type: null,
        name: 'file-no-extension',
        fileId: 'file-123',
        folderUuid: 'folder-uuid-456',
        size: 512,
      } as unknown;

      expect(checkIsFile(file as DriveItemData)).toBe(true);
    });

    describe('Focused items', () => {
      it('when a focused item is a file, then it is recognized as a file', () => {
        const focusedFile: DriveItemFocused = {
          id: 1,
          type: 'jpg',
          name: 'photo.jpg',
          fileId: 'file-123',
          folderUuid: 'folder-uuid',
          size: 2048,
          updatedAt: '2025-12-18T00:00:00Z',
          isFolder: false,
        };

        expect(checkIsFile(focusedFile)).toBe(true);
      });

      it('when a focused item is a folder, then it is not recognized as a file', () => {
        const focusedFolder: DriveItemFocused = {
          id: 1,
          type: 'folder',
          name: 'Documents',
          parentUuid: 'parent-uuid',
          updatedAt: '2025-12-18T00:00:00Z',
          isFolder: true,
        };

        expect(checkIsFile(focusedFolder)).toBe(false);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('when distinguishing between empty file and empty folder, then each is correctly identified', () => {
      const emptyFile: Partial<DriveItemData> = {
        id: 1,
        type: 'bin',
        name: 'empty-file.bin',
        folderUuid: 'folder-uuid',
        size: 0,
      };

      const emptyFolder: Partial<DriveItemData> = {
        id: 2,
        type: 'folder',
        name: 'Empty Folder',
        parentUuid: 'parent-uuid',
        size: 0,
      };

      expect(checkIsFile(emptyFile as DriveItemData)).toBe(true);
      expect(checkIsFolder(emptyFile as DriveItemData)).toBe(false);
      expect(isEmptyFile(emptyFile as DriveItemData)).toBe(true);
      expect(getFileSize(emptyFile as DriveItemData)).toBe(0);

      expect(checkIsFile(emptyFolder as DriveItemData)).toBe(false);
      expect(checkIsFolder(emptyFolder as DriveItemData)).toBe(true);
      expect(isEmptyFile(emptyFolder as DriveItemData)).toBe(true);
      expect(getFileSize(emptyFolder as DriveItemData)).toBe(0);
    });

    it('when processing a large file from production, then it is correctly identified', () => {
      const realFile = {
        bucket: 'd871da4c5aacc64e106b0afb',
        createdAt: '2025-12-11T09:09:01.673Z',
        fileId: '693a8a2c7ccfc45e1feb5e30',
        folderUuid: '2fdb127e-fdd6-4687-9051-53761920e5d2',
        id: 1076106294,
        name: '1gb',
        size: '1073741824',
        type: null,
        updatedAt: '2025-12-11T09:09:02.000Z',
        uuid: 'd4918a26-8ee8-46fd-9cf2-d49a662d84d7',
      } as unknown;

      expect(checkIsFile(realFile as DriveItemData)).toBe(true);
      expect(checkIsFolder(realFile as DriveItemData)).toBe(false);
      expect(isEmptyFile(realFile as DriveItemData)).toBe(false);
      expect(getFileSize(realFile as DriveItemData)).toBe(1073741824);
    });

    it('when processing a folder from production, then it is correctly identified', () => {
      const realFolder: Partial<DriveItemData> = {
        createdAt: '2025-06-10T06:52:56.000Z',
        id: 120640427,
        name: 'test folder',
        parentUuid: '2fdb127e-fdd6-4687-9051-53761920e5d2',
        size: 0,
        type: 'folder',
        updatedAt: '2025-09-30T08:24:17.000Z',
        uuid: 'bc7307f2-7e69-4005-8546-f888b1270a12',
      };

      expect(checkIsFile(realFolder as DriveItemData)).toBe(false);
      expect(checkIsFolder(realFolder as DriveItemData)).toBe(true);
      expect(getFileSize(realFolder as DriveItemData)).toBe(0);
    });
  });
});
