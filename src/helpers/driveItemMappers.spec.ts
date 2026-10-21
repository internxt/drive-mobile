import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { TrashItem } from '../services/drive/trash';
import {
  mapFileWithIsFolder,
  mapFolderWithIsFolder,
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
