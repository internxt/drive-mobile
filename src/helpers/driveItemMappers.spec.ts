import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { TrashItem } from '../services/drive/trash';
import {
  mapFileWithIsFolder,
  mapFilesWithIsFolder,
  mapFolderWithIsFolder,
  mapFoldersWithIsFolder,
  mapRecentFile,
  mapSharedFile,
  mapSharedFolder,
  mapTrashFile,
  mapTrashFolder,
} from './driveItemMappers';

describe('Drive item mappers', () => {
  describe('Generic mappers', () => {
    describe('mapFileWithIsFolder', () => {
      it('when mapping a file object, then it adds isFolder: false', () => {
        const file = {
          id: 1,
          name: 'document.pdf',
          type: 'pdf',
          size: 1024,
        };

        const result = mapFileWithIsFolder(file);

        expect(result).toEqual({
          id: 1,
          name: 'document.pdf',
          type: 'pdf',
          size: 1024,
          isFolder: false,
        });
        expect(result.isFolder).toBe(false);
      });

      it('when mapping a file with existing properties, then it preserves all properties', () => {
        const file = {
          id: 123,
          uuid: 'abc-123',
          fileId: 'file-456',
          bucket: 'bucket-789',
          createdAt: '2025-12-18',
        };

        const result = mapFileWithIsFolder(file);

        expect(result).toMatchObject(file);
        expect(result.isFolder).toBe(false);
      });
    });

    describe('mapFolderWithIsFolder', () => {
      it('when mapping a folder object, then it adds isFolder: true', () => {
        const folder = {
          id: 1,
          name: 'My Folder',
          parentId: 2,
        };

        const result = mapFolderWithIsFolder(folder);

        expect(result).toEqual({
          id: 1,
          name: 'My Folder',
          parentId: 2,
          isFolder: true,
        });
        expect(result.isFolder).toBe(true);
      });

      it('when mapping a folder with existing properties, then it preserves all properties', () => {
        const folder = {
          id: 456,
          uuid: 'folder-uuid-789',
          parentUuid: 'parent-uuid-123',
          createdAt: '2025-12-18',
        };

        const result = mapFolderWithIsFolder(folder);

        expect(result).toMatchObject(folder);
        expect(result.isFolder).toBe(true);
      });
    });

    describe('mapFilesWithIsFolder', () => {
      it('when mapping an array of files, then all have isFolder: false', () => {
        const files = [
          { id: 1, name: 'file1.txt' },
          { id: 2, name: 'file2.jpg' },
          { id: 3, name: 'file3.pdf' },
        ];

        const result = mapFilesWithIsFolder(files);

        expect(result).toHaveLength(3);
        result.forEach((file) => {
          expect(file.isFolder).toBe(false);
        });
      });

      it('when mapping an empty array, then it returns an empty array', () => {
        const result = mapFilesWithIsFolder([]);

        expect(result).toEqual([]);
      });
    });

    describe('mapFoldersWithIsFolder', () => {
      it('when mapping an array of folders, then all have isFolder: true', () => {
        const folders = [
          { id: 1, name: 'Folder 1' },
          { id: 2, name: 'Folder 2' },
          { id: 3, name: 'Folder 3' },
        ];

        const result = mapFoldersWithIsFolder(folders);

        expect(result).toHaveLength(3);
        result.forEach((folder) => {
          expect(folder.isFolder).toBe(true);
        });
      });

      it('when mapping an empty array, then it returns an empty array', () => {
        const result = mapFoldersWithIsFolder([]);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Recent file mapper', () => {
    describe('mapRecentFile', () => {
      it('when mapping a recent file with plainName, then it uses plainName as name', () => {
        const recentFile = {
          id: 1,
          fileId: 'file-123',
          name: 'encrypted-name',
          plainName: 'My Document.pdf',
          type: 'pdf',
          size: 2048,
        } as unknown as DriveFileData;

        const result = mapRecentFile(recentFile);

        expect(result.name).toBe('My Document.pdf');
        expect(result.isFolder).toBe(false);
      });

      it('when mapping a recent file without plainName, then it uses name', () => {
        const recentFile = {
          id: 2,
          fileId: 'file-456',
          name: 'document.txt',
          plainName: null,
          type: 'txt',
          size: 512,
        } as unknown as DriveFileData;

        const result = mapRecentFile(recentFile);

        expect(result.name).toBe('document.txt');
        expect(result.isFolder).toBe(false);
      });

      it('when mapping a recent file, then it preserves all original properties', () => {
        const recentFile = {
          id: 3,
          fileId: 'file-789',
          name: 'name',
          plainName: 'plainName',
          type: 'jpg',
          size: 1024,
          uuid: 'uuid-123',
          bucket: 'bucket-456',
          createdAt: '2025-12-18',
          updatedAt: '2025-12-18',
        } as unknown as DriveFileData;

        const result = mapRecentFile(recentFile);

        expect(result).toMatchObject({
          id: 3,
          fileId: 'file-789',
          type: 'jpg',
          size: 1024,
          uuid: 'uuid-123',
          bucket: 'bucket-456',
        });
        expect(result.name).toBe('plainName');
        expect(result.isFolder).toBe(false);
      });
    });
  });

  describe('Trash item mappers', () => {
    describe('mapTrashFile', () => {
      it('when mapping a trash file, then it uses plainName and sets isFolder: false', () => {
        const trashFile = {
          id: 1,
          name: 'encrypted-name',
          plainName: 'Deleted File.pdf',
          type: 'pdf',
          size: 1024,
        } as unknown as TrashItem;

        const result = mapTrashFile(trashFile);

        expect(result.name).toBe('Deleted File.pdf');
        expect(result.isFolder).toBe(false);
      });

      it('when mapping a trash file, then it preserves all properties', () => {
        const trashFile = {
          id: 2,
          uuid: 'trash-file-uuid',
          plainName: 'File.txt',
          type: 'txt',
          size: 512,
          deletedAt: '2025-12-18',
        } as unknown as TrashItem;

        const result = mapTrashFile(trashFile);

        expect(result).toMatchObject({
          id: 2,
          uuid: 'trash-file-uuid',
          type: 'txt',
          size: 512,
          deletedAt: '2025-12-18',
        });
        expect(result.name).toBe('File.txt');
        expect(result.isFolder).toBe(false);
      });
    });

    describe('mapTrashFolder', () => {
      it('when mapping a trash folder, then it sets isFolder: true', () => {
        const trashFolder = {
          id: 1,
          name: 'Deleted Folder',
          type: 'folder',
          parentUuid: 'parent-uuid',
        } as unknown as TrashItem;

        const result = mapTrashFolder(trashFolder);

        expect(result.isFolder).toBe(true);
      });

      it('when mapping a trash folder, then it preserves all properties', () => {
        const trashFolder = {
          id: 3,
          uuid: 'trash-folder-uuid',
          name: 'Old Folder',
          parentUuid: 'parent-uuid-123',
          deletedAt: '2025-12-18',
        } as unknown as TrashItem;

        const result = mapTrashFolder(trashFolder);

        expect(result).toMatchObject({
          id: 3,
          uuid: 'trash-folder-uuid',
          name: 'Old Folder',
          parentUuid: 'parent-uuid-123',
          deletedAt: '2025-12-18',
        });
        expect(result.isFolder).toBe(true);
      });
    });
  });

  describe('Shared item mappers', () => {
    describe('mapSharedFile', () => {
      it('when mapping a shared file, then it sets isFolder: false', () => {
        const sharedFile = {
          id: 1,
          name: 'Shared Document.pdf',
          type: 'pdf',
          size: 2048,
        } as unknown as SharedFiles;

        const result = mapSharedFile(sharedFile);

        expect(result.isFolder).toBe(false);
      });

      it('when mapping a shared file, then it preserves all properties', () => {
        const sharedFile = {
          id: 2,
          uuid: 'shared-file-uuid',
          name: 'Report.xlsx',
          type: 'xlsx',
          size: 4096,
          views: 10,
        } as unknown as SharedFiles;

        const result = mapSharedFile(sharedFile);

        expect(result).toMatchObject({
          id: 2,
          uuid: 'shared-file-uuid',
          name: 'Report.xlsx',
          type: 'xlsx',
          size: 4096,
          views: 10,
        });
        expect(result.isFolder).toBe(false);
      });
    });

    describe('mapSharedFolder', () => {
      it('when mapping a shared folder, then it sets isFolder: true', () => {
        const sharedFolder = {
          id: 1,
          name: 'Shared Folder',
        } as unknown as SharedFolders;

        const result = mapSharedFolder(sharedFolder);

        expect(result.isFolder).toBe(true);
      });

      it('when mapping a shared folder, then it preserves all properties', () => {
        const sharedFolder = {
          id: 3,
          uuid: 'shared-folder-uuid',
          name: 'Team Documents',
          views: 25,
        } as unknown as SharedFolders;

        const result = mapSharedFolder(sharedFolder);

        expect(result).toMatchObject({
          id: 3,
          uuid: 'shared-folder-uuid',
          name: 'Team Documents',
          views: 25,
        });
        expect(result.isFolder).toBe(true);
      });
    });
  });

  describe('Edge cases', () => {
    it('when mapping a file with type "folder", then isFolder is still false', () => {
      const file = {
        id: 1,
        name: 'archive.folder',
        type: 'folder',
        size: 2048,
      };

      const result = mapFileWithIsFolder(file);

      expect(result.isFolder).toBe(false);
      expect(result.type).toBe('folder');
    });

    it('when mapping objects with existing isFolder field, then it gets overwritten', () => {
      const fileWithWrongFlag = {
        id: 1,
        name: 'file.txt',
        isFolder: true,
      } as any;

      const result = mapFileWithIsFolder(fileWithWrongFlag);

      expect(result.isFolder).toBe(false);
    });

    it('when mapping large arrays, then all items are processed correctly', () => {
      const files = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `file-${i}.txt`,
      }));

      const result = mapFilesWithIsFolder(files);

      expect(result).toHaveLength(100);
      expect(result.every((f) => f.isFolder === false)).toBe(true);
    });
  });

  describe('Type consistency', () => {
    it('when using mapFileWithIsFolder, then TypeScript infers isFolder as literal false', () => {
      const file = { id: 1, name: 'test.txt' };
      const result = mapFileWithIsFolder(file);

      const isFolderType: false = result.isFolder;
      expect(isFolderType).toBe(false);
    });

    it('when using mapFolderWithIsFolder, then TypeScript infers isFolder as literal true', () => {
      const folder = { id: 1, name: 'test folder' };
      const result = mapFolderWithIsFolder(folder);

      const isFolderType: true = result.isFolder;
      expect(isFolderType).toBe(true);
    });
  });
});
