import { FolderTree, FolderTreeNode } from '../../../../types/drive/folderUpload';
import { filterOversizedFromTree } from './filterOversizedFromTree';

const mockNotify = jest.fn();
jest.mock('../../file/utils/fileSizeErrors', () => ({
  notifyFilesExcludedBySize: (...args: unknown[]) => mockNotify(...args),
}));

const makeFile = (name: string, size: number): FolderTreeNode => ({
  name,
  size,
  uri: `file:///tmp/${name}`,
  relativePath: name,
  parentPath: '',
  isDirectory: false,
});

const makeTree = (files: FolderTreeNode[]): FolderTree => ({ files, dirs: [] });

describe('filterOversizedFromTree', () => {
  beforeEach(() => {
    mockNotify.mockReset();
  });

  test('when maxUploadFileSize is 0 (unlimited/unknown), then it skips filtering and does not notify', () => {
    const tree = makeTree([makeFile('a.pdf', 10), makeFile('huge.bin', 50 * 1024 * 1024 * 1024)]);
    const dispatch = jest.fn();

    const result = filterOversizedFromTree(tree, 0, dispatch);

    expect(result).toEqual([]);
    expect(tree.files).toHaveLength(2);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test('when a file equals the limit, then it is kept (inclusive boundary)', () => {
    const exact = makeFile('exact.bin', 1000);
    const tree = makeTree([exact]);
    const dispatch = jest.fn();

    const result = filterOversizedFromTree(tree, 1000, dispatch);

    expect(result).toEqual([]);
    expect(tree.files).toEqual([exact]);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  test('when some files exceed the limit, then it returns and removes only those, keeping the rest', () => {
    const small = makeFile('small.pdf', 100);
    const big = makeFile('big.pdf', 5000);
    const tree = makeTree([small, big]);
    const dispatch = jest.fn();

    const result = filterOversizedFromTree(tree, 1000, dispatch);

    expect(result).toEqual([big]);
    expect(tree.files).toEqual([small]);
    expect(mockNotify).toHaveBeenCalledWith([big], dispatch);
  });

  test('when every file exceeds the limit, then it returns all of them and empties tree.files', () => {
    const big1 = makeFile('big1.pdf', 5000);
    const big2 = makeFile('big2.pdf', 6000);
    const tree = makeTree([big1, big2]);
    const dispatch = jest.fn();

    const result = filterOversizedFromTree(tree, 1000, dispatch);

    expect(result).toEqual([big1, big2]);
    expect(tree.files).toEqual([]);
    expect(mockNotify).toHaveBeenCalledWith([big1, big2], dispatch);
  });

  test('when filtering runs, then tree.dirs is left unchanged', () => {
    const dir: FolderTreeNode = {
      name: 'sub',
      size: 0,
      uri: 'file:///tmp/sub',
      relativePath: 'sub',
      parentPath: '',
      isDirectory: true,
    };
    const tree: FolderTree = { files: [makeFile('big.pdf', 5000)], dirs: [dir] };
    const dispatch = jest.fn();

    filterOversizedFromTree(tree, 1000, dispatch);

    expect(tree.dirs).toEqual([dir]);
  });
});
