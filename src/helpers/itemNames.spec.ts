import { DriveItemDataProps } from '../types/drive';
import { getDisplayName } from './itemNames';

describe('getDisplayName', () => {
  describe('Folders', () => {
    it('should return the folder name as-is', () => {
      const folder = {
        id: 1,
        name: 'Documents',
        isFolder: true,
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(folder)).toBe('Documents');
    });

    it('should handle folder names with special characters', () => {
      const folder: DriveItemDataProps = {
        id: 1,
        name: 'My Folder (2024)',
        isFolder: true,
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(folder)).toBe('My Folder (2024)');
    }) as unknown as DriveItemDataProps;

    it('should handle folder names with dots', () => {
      const folder: DriveItemDataProps = {
        id: 1,
        name: 'backup.2024',
        isFolder: true,
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(folder)).toBe('backup.2024');
    });
  });

  describe('Files without extension in name', () => {
    it('should append the extension to the file name', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'report',
        type: 'pdf',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('report.pdf');
    });

    it('should handle different file extensions', () => {
      const cases = [
        { name: 'image', type: 'jpg', expected: 'image.jpg' },
        { name: 'document', type: 'docx', expected: 'document.docx' },
        { name: 'video', type: 'mp4', expected: 'video.mp4' },
        { name: 'data', type: 'json', expected: 'data.json' },
      ];

      cases.forEach(({ name, type, expected }) => {
        const file: DriveItemDataProps = {
          id: 1,
          name,
          type,
          isFolder: false,
          fileId: 'file-1',
          updatedAt: '2025-01-01',
          createdAt: '2025-01-01',
        } as unknown as DriveItemDataProps;

        expect(getDisplayName(file)).toBe(expected);
      });
    });
  });

  describe('Files with extension already in name', () => {
    it('should always append the type extension even if present in name', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'report.pdf',
        type: 'pdf',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('report.pdf.pdf');
    });

    it('should append extension regardless of case matching', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'Image.JPG',
        type: 'jpg',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('Image.JPG.jpg');
    });

    it('should always append type to files with multiple dots in name', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'backup.2024.01.15.tar',
        type: 'tar',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('backup.2024.01.15.tar.tar');
    });

    it('should append type even when name ends with same extension', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'document.PDF',
        type: 'pdf',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('document.PDF.pdf');
    });
  });

  describe('Files without type', () => {
    it('should return the name as-is when type is undefined', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'unknown',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('unknown');
    });

    it('should return the name as-is when type is null', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'noextension',
        type: undefined,
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('noextension');
    });

    it('should preserve existing extension in name when type is undefined', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'file.txt',
        type: undefined,
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('file.txt');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty type string', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'file',
        type: '',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('file');
    });

    it('should handle type with leading/trailing whitespace', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'document',
        type: ' pdf ',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('document. pdf ');
    });

    it('should handle type with only whitespace', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'document',
        type: '   ',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('document');
    });

    it('should handle files with dots but different extension', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'archive.tar',
        type: 'gz',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('archive.tar.gz');
    });

    it('should handle numeric extensions', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'file',
        type: '001',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('file.001');
    });

    it('should handle special characters in extension', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'document',
        type: 'pdf~',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('document.pdf~');
    });

    it('should handle very long extensions', () => {
      const longExtension = 'verylongextensionname';
      const file: DriveItemDataProps = {
        id: 1,
        name: 'file',
        type: longExtension,
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe(`file.${longExtension}`);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle common document files', () => {
      const scenarios = [
        { name: 'Meeting Notes', type: 'docx', expected: 'Meeting Notes.docx' },
        { name: 'Budget 2024', type: 'xlsx', expected: 'Budget 2024.xlsx' },
        { name: 'Presentation', type: 'pptx', expected: 'Presentation.pptx' },
      ];

      scenarios.forEach(({ name, type, expected }) => {
        const file: DriveItemDataProps = {
          id: 1,
          name,
          type,
          isFolder: false,
          fileId: 'file-1',
          updatedAt: '2025-01-01',
          createdAt: '2025-01-01',
        } as unknown as DriveItemDataProps;

        expect(getDisplayName(file)).toBe(expected);
      });
    });

    it('should handle compressed archives with double extensions', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'backup.tar',
        type: 'gz',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('backup.tar.gz');
    });

    it('should handle versioned files', () => {
      const file: DriveItemDataProps = {
        id: 1,
        name: 'document.v2',
        type: 'pdf',
        isFolder: false,
        fileId: 'file-1',
        updatedAt: '2025-01-01',
        createdAt: '2025-01-01',
      } as unknown as DriveItemDataProps;

      expect(getDisplayName(file)).toBe('document.v2.pdf');
    });
  });
});
