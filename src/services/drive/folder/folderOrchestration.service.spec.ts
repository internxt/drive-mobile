import { uploadFolderContents, getMaxDepth } from './folderOrchestration.service';
import { FolderTree, FolderTreeNode } from '../../../types/drive/folderUpload';

const mockCreateFolder = jest.fn();
const mockCheckDuplicatedFolders = jest.fn();

jest.mock('./driveFolder.service', () => ({
  driveFolderService: {
    createFolder: (...args: unknown[]) => mockCreateFolder(...args),
    checkDuplicatedFolders: (...args: unknown[]) => mockCheckDuplicatedFolders(...args),
  },
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const ROOT = 'root-uuid';

const makeFile = (name: string, parentPath: string, size = 1024): FolderTreeNode => ({
  name,
  relativePath: parentPath ? `${parentPath}/${name}` : name,
  parentPath,
  isDirectory: false,
  size,
  uri: `file:///root/${parentPath ? parentPath + '/' : ''}${name}`,
});

const makeDir = (relativePath: string): FolderTreeNode => {
  const parts = relativePath.split('/');
  const name = parts.pop()!;
  const parentPath = parts.join('/');
  return { name, relativePath, parentPath, isDirectory: true, size: 0, uri: `file:///root/${relativePath}` };
};

const makeTree = (dirs: FolderTreeNode[], files: FolderTreeNode[]): FolderTree => ({ dirs, files });

const makeSignal = (aborted = false): AbortSignal => {
  const ctrl = new AbortController();
  if (aborted) ctrl.abort();
  return ctrl.signal;
};

describe('getMaxDepth', () => {
  it('when dirs is empty, then returns 0', () => {
    expect(getMaxDepth([])).toBe(0);
  });

  it('when dirs has a single flat entry, then returns 1', () => {
    expect(getMaxDepth([makeDir('photos')])).toBe(1);
  });

  it('when dirs has two entries one level deep, then returns 2', () => {
    expect(getMaxDepth([makeDir('photos'), makeDir('photos/vacation')])).toBe(2);
  });

  it('when dirs has three levels of nesting, then returns 3', () => {
    expect(getMaxDepth([makeDir('a'), makeDir('a/b'), makeDir('a/b/c')])).toBe(3);
  });
});

describe('uploadFolderContents', () => {
  const uploadFile = jest.fn();
  const onProgress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFolder.mockResolvedValue({ uuid: 'new-folder-uuid' });
    mockCheckDuplicatedFolders.mockResolvedValue({ existentFolders: [] });
    uploadFile.mockResolvedValue(undefined);
  });

  describe('happy path', () => {
    it('when tree is empty, then returns all-zero counts', async () => {
      const result = await uploadFolderContents({
        tree: makeTree([], []),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      expect(result).toEqual({
        totalFiles: 0, uploadedFiles: 0, failedFiles: 0,
        totalFolders: 0, createdFolders: 0, failedFolders: 0,
        cancelled: false,
      });
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it('when tree has only root-level files, then uploads all files to rootParentUuid', async () => {
      const files = [makeFile('a.jpg', ''), makeFile('b.jpg', ''), makeFile('c.jpg', '')];

      const result = await uploadFolderContents({
        tree: makeTree([], files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      expect(result).toEqual({
        totalFiles: 3, uploadedFiles: 3, failedFiles: 0,
        totalFolders: 0, createdFolders: 0, failedFolders: 0,
        cancelled: false,
      });
      expect(uploadFile).toHaveBeenCalledTimes(3);
      files.forEach((f) => {
        expect(uploadFile).toHaveBeenCalledWith(f, ROOT, expect.any(AbortSignal));
      });
    });

    it('when tree has one subfolder with one file, then creates the folder and uploads the file to it', async () => {
      // Arrange
      mockCreateFolder.mockResolvedValue({ uuid: 'photos-uuid' });
      const dirs = [makeDir('photos')];
      const files = [makeFile('img.jpg', 'photos')];

      // Act
      const result = await uploadFolderContents({
        tree: makeTree(dirs, files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.uploadedFiles).toBe(1);
      expect(mockCreateFolder).toHaveBeenCalledWith(ROOT, 'photos');
      expect(uploadFile).toHaveBeenCalledWith(files[0], 'photos-uuid', expect.any(AbortSignal));
    });

    it('when tree has two levels of nested dirs with files, then creates folders in order and routes files to correct parent UUIDs', async () => {
      // Arrange
      mockCreateFolder
        .mockResolvedValueOnce({ uuid: 'photos-uuid' })
        .mockResolvedValueOnce({ uuid: 'vacation-uuid' });
      const dirs = [makeDir('photos'), makeDir('photos/vacation')];
      const files = [makeFile('root.jpg', ''), makeFile('photo.jpg', 'photos'), makeFile('vac.jpg', 'photos/vacation')];

      // Act
      const result = await uploadFolderContents({
        tree: makeTree(dirs, files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result).toEqual({
        totalFiles: 3, uploadedFiles: 3, failedFiles: 0,
        totalFolders: 2, createdFolders: 2, failedFolders: 0,
        cancelled: false,
      });
      expect(mockCreateFolder).toHaveBeenCalledWith(ROOT, 'photos');
      expect(mockCreateFolder).toHaveBeenCalledWith('photos-uuid', 'vacation');
      expect(uploadFile).toHaveBeenCalledWith(files[0], ROOT, expect.any(AbortSignal));
      expect(uploadFile).toHaveBeenCalledWith(files[1], 'photos-uuid', expect.any(AbortSignal));
      expect(uploadFile).toHaveBeenCalledWith(files[2], 'vacation-uuid', expect.any(AbortSignal));
    });

    it('when tree has nested dirs but no files, then creates all folders and does not upload any file', async () => {
      // Arrange
      mockCreateFolder
        .mockResolvedValueOnce({ uuid: 'a-uuid' })
        .mockResolvedValueOnce({ uuid: 'ab-uuid' });

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([makeDir('a'), makeDir('a/b')], []),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result).toEqual({
        totalFiles: 0, uploadedFiles: 0, failedFiles: 0,
        totalFolders: 2, createdFolders: 2, failedFolders: 0,
        cancelled: false,
      });
      expect(mockCreateFolder).toHaveBeenCalledWith(ROOT, 'a');
      expect(mockCreateFolder).toHaveBeenCalledWith('a-uuid', 'b');
      expect(uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('folder merge on 409', () => {
    it('when createFolder returns 409, then calls checkDuplicatedFolders and uploads to the existing UUID', async () => {
      // Arrange
      mockCreateFolder.mockRejectedValueOnce({ status: 409, message: 'Already exists' });
      mockCheckDuplicatedFolders.mockResolvedValueOnce({
        existentFolders: [{ plainName: 'photos', uuid: 'existing-uuid' }],
      });

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([makeDir('photos')], [makeFile('img.jpg', 'photos')]),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.uploadedFiles).toBe(1);
      expect(uploadFile).toHaveBeenCalledWith(expect.anything(), 'existing-uuid', expect.any(AbortSignal));
    });

    it('when folder name has special characters and createFolder returns 409, then passes the name directly to checkDuplicatedFolders', async () => {
      // Arrange
      mockCreateFolder.mockRejectedValueOnce({ status: 409 });
      mockCheckDuplicatedFolders.mockResolvedValueOnce({
        existentFolders: [{ plainName: 'Café', uuid: 'cafe-uuid' }],
      });

      // Act
      await uploadFolderContents({
        tree: makeTree([makeDir('Café')], [makeFile('f.txt', 'Café')]),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(mockCheckDuplicatedFolders).toHaveBeenCalledWith(ROOT, ['Café']);
      expect(uploadFile).toHaveBeenCalledWith(expect.anything(), 'cafe-uuid', expect.any(AbortSignal));
    });

    it('when createFolder returns 409 and checkDuplicatedFolders returns empty, then counts the dependent file as failed', async () => {
      // Arrange
      mockCreateFolder.mockRejectedValueOnce({ status: 409 });
      mockCheckDuplicatedFolders.mockResolvedValueOnce({ existentFolders: [] });

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([makeDir('photos')], [makeFile('img.jpg', 'photos')]),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.failedFiles).toBe(1);
      expect(result.uploadedFiles).toBe(0);
    });

    it('when createFolder returns a non-409 error, then does not call checkDuplicatedFolders', async () => {
      // Arrange
      mockCreateFolder.mockRejectedValueOnce({ status: 500, message: 'Internal Server Error' });

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([makeDir('photos')], [makeFile('img.jpg', 'photos')]),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.failedFiles).toBe(1);
      expect(mockCheckDuplicatedFolders).not.toHaveBeenCalled();
    });
  });

  describe('individual file failures', () => {
    it('when one file upload fails, then counts it as failed and continues uploading the rest', async () => {
      // Arrange
      uploadFile.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue(undefined);
      const files = [makeFile('a.jpg', ''), makeFile('b.jpg', ''), makeFile('c.jpg', '')];

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([], files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.failedFiles).toBe(1);
      expect(result.uploadedFiles).toBe(2);
      expect(result.cancelled).toBe(false);
    });

    it('when all file uploads fail, then counts all as failed and does not mark as cancelled', async () => {
      // Arrange
      uploadFile.mockRejectedValue(new Error('Network error'));
      const files = [makeFile('a.jpg', ''), makeFile('b.jpg', '')];

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([], files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.failedFiles).toBe(2);
      expect(result.uploadedFiles).toBe(0);
      expect(result.cancelled).toBe(false);
    });
  });

  describe('onProgress', () => {
    it('when files succeed and fail, then calls onProgress once per file', async () => {
      uploadFile.mockRejectedValueOnce(new Error('fail')).mockResolvedValue(undefined);
      const files = [makeFile('a.jpg', ''), makeFile('b.jpg', ''), makeFile('c.jpg', '')];

      await uploadFolderContents({
        tree: makeTree([], files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      expect(onProgress).toHaveBeenCalledTimes(3);
    });

    it('when all files succeed, then last onProgress call reports the total uploaded count', async () => {
      const files = [makeFile('a.jpg', ''), makeFile('b.jpg', '')];

      await uploadFolderContents({
        tree: makeTree([], files),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      expect(onProgress).toHaveBeenLastCalledWith(2, 0);
    });
  });

  describe('cancellation', () => {
    it('when signal is already aborted before calling, then returns cancelled=true without uploading any file', async () => {
      const result = await uploadFolderContents({
        tree: makeTree([], [makeFile('a.jpg', ''), makeFile('b.jpg', '')]),
        rootParentUuid: ROOT,
        signal: makeSignal(true),
        onProgress,
        uploadFile,
      });

      expect(result.cancelled).toBe(true);
      expect(result.failedFiles).toBe(0);
      expect(uploadFile).not.toHaveBeenCalled();
    });

    it('when uploadFile throws AbortError, then sets cancelled=true and does not increment failedFiles', async () => {
      // Arrange
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      uploadFile.mockRejectedValue(abortError);

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([], [makeFile('a.jpg', ''), makeFile('b.jpg', '')]),
        rootParentUuid: ROOT,
        signal: makeSignal(),
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.failedFiles).toBe(0);
      expect(result.cancelled).toBe(true);
    });

    it('when signal is aborted after first upload, then does not start more than the concurrent limit', async () => {
      // Arrange
      const abortController = new AbortController();
      let callCount = 0;

      uploadFile.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) abortController.abort();
      });

      const files = Array.from({ length: 10 }, (_, i) => makeFile(`f${i}.jpg`, ''));

      // Act
      const result = await uploadFolderContents({
        tree: makeTree([], files),
        rootParentUuid: ROOT,
        signal: abortController.signal,
        onProgress,
        uploadFile,
      });

      // Assert
      expect(result.cancelled).toBe(true);
      // With pLimit(3), at most 3 uploads may start before abort is detected
      expect(uploadFile.mock.calls.length).toBeLessThanOrEqual(3);
    });

    it('when signal is pre-aborted and tree is empty, then returns all-zero counts with cancelled=true', async () => {
      const result = await uploadFolderContents({
        tree: makeTree([], []),
        rootParentUuid: ROOT,
        signal: makeSignal(true),
        onProgress,
        uploadFile,
      });

      expect(result).toEqual({
        totalFiles: 0, uploadedFiles: 0, failedFiles: 0,
        totalFolders: 0, createdFolders: 0, failedFolders: 0,
        cancelled: true,
      });
    });
  });

  describe('concurrent upload independence', () => {
    it('when two uploads run concurrently with independent signals, then both complete with their own file counts', async () => {
      // Arrange
      const onProgressA = jest.fn();
      const onProgressB = jest.fn();
      const uploadFileA = jest.fn().mockResolvedValue(undefined);
      const uploadFileB = jest.fn().mockResolvedValue(undefined);

      // Act
      const [resultA, resultB] = await Promise.all([
        uploadFolderContents({
          tree: makeTree([], [makeFile('a1.jpg', ''), makeFile('a2.jpg', '')]),
          rootParentUuid: 'root-a',
          signal: makeSignal(),
          onProgress: onProgressA,
          uploadFile: uploadFileA,
        }),
        uploadFolderContents({
          tree: makeTree([], [makeFile('b1.jpg', ''), makeFile('b2.jpg', ''), makeFile('b3.jpg', '')]),
          rootParentUuid: 'root-b',
          signal: makeSignal(),
          onProgress: onProgressB,
          uploadFile: uploadFileB,
        }),
      ]);

      // Assert
      expect(resultA).toEqual({
        totalFiles: 2, uploadedFiles: 2, failedFiles: 0,
        totalFolders: 0, createdFolders: 0, failedFolders: 0,
        cancelled: false,
      });
      expect(resultB).toEqual({
        totalFiles: 3, uploadedFiles: 3, failedFiles: 0,
        totalFolders: 0, createdFolders: 0, failedFolders: 0,
        cancelled: false,
      });
      expect(uploadFileA).toHaveBeenCalledTimes(2);
      expect(uploadFileB).toHaveBeenCalledTimes(3);
    });

    it('when signal A is aborted mid-upload, then upload B completes successfully', async () => {
      // Arrange
      const firstUploadController = new AbortController();
      const uploadFileA = jest.fn().mockImplementation(async () => {
        firstUploadController.abort();
      });
      const uploadFileB = jest.fn().mockResolvedValue(undefined);

      // Act
      const [resultA, resultB] = await Promise.all([
        uploadFolderContents({
          tree: makeTree([], [makeFile('a.jpg', ''), makeFile('a2.jpg', '')]),
          rootParentUuid: 'root-a',
          signal: firstUploadController.signal,
          onProgress: jest.fn(),
          uploadFile: uploadFileA,
        }),
        uploadFolderContents({
          tree: makeTree([], [makeFile('b1.jpg', ''), makeFile('b2.jpg', '')]),
          rootParentUuid: 'root-b',
          signal: makeSignal(),
          onProgress: jest.fn(),
          uploadFile: uploadFileB,
        }),
      ]);

      // Assert
      expect(resultA.cancelled).toBe(true);
      expect(resultB.cancelled).toBe(false);
      expect(resultB.uploadedFiles).toBe(2);
    });
  });
});
