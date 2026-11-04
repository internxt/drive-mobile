const mockGetFolderFilesByUuid = jest.fn();
const mockGetFolderFoldersByUuid = jest.fn();

jest.mock('../../native/InternxtSignalingModule', () => ({
  notifyParentChanged: jest.fn(),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  SdkManager: {
    getInstance: () => ({
      storageV2: {
        getFolderFilesByUuid: (...args: unknown[]) => mockGetFolderFilesByUuid(...args),
        getFolderFoldersByUuid: (...args: unknown[]) => mockGetFolderFoldersByUuid(...args),
      },
    }),
  },
}));

import { SortDirection, SortMode, SortType } from '@internxt-mobile/types/drive/ui';
import { driveFolderService } from './driveFolder.service';

const FOLDER_UUID = 'folder-uuid';
const OFFSET = 50;
const LIMIT = 50;

const requestWithSort = async (sortMode: SortMode) => {
  await driveFolderService.getFolderFiles(FOLDER_UUID, OFFSET, LIMIT, sortMode);
  await driveFolderService.getFolderFolders(FOLDER_UUID, OFFSET, LIMIT, sortMode);

  return {
    filesSort: mockGetFolderFilesByUuid.mock.calls[0].slice(3),
    foldersSort: mockGetFolderFoldersByUuid.mock.calls[0].slice(3),
  };
};

describe('Asking Drive for the content of a folder in the chosen order', () => {
  beforeEach(() => {
    mockGetFolderFilesByUuid.mockReset().mockReturnValue([Promise.resolve({ files: [] })]);
    mockGetFolderFoldersByUuid.mockReset().mockReturnValue([Promise.resolve({ folders: [] })]);
  });

  test('when sorting by name from A to Z, then files and folders are asked by name in ascending order', async () => {
    const { filesSort, foldersSort } = await requestWithSort({ type: SortType.Name, direction: SortDirection.Asc });

    expect(filesSort).toStrictEqual(['plainName', 'ASC']);
    expect(foldersSort).toStrictEqual(['plainName', 'ASC']);
  });

  test('when sorting by name from Z to A, then files and folders are asked by name in descending order', async () => {
    const { filesSort, foldersSort } = await requestWithSort({ type: SortType.Name, direction: SortDirection.Desc });

    expect(filesSort).toStrictEqual(['plainName', 'DESC']);
    expect(foldersSort).toStrictEqual(['plainName', 'DESC']);
  });

  test('when sorting newer first, then files and folders are asked with the latest change first', async () => {
    const { filesSort, foldersSort } = await requestWithSort({
      type: SortType.UpdatedAt,
      direction: SortDirection.Asc,
    });

    expect(filesSort).toStrictEqual(['updatedAt', 'DESC']);
    expect(foldersSort).toStrictEqual(['updatedAt', 'DESC']);
  });

  test('when sorting older first, then files and folders are asked with the earliest change first', async () => {
    const { filesSort, foldersSort } = await requestWithSort({
      type: SortType.UpdatedAt,
      direction: SortDirection.Desc,
    });

    expect(filesSort).toStrictEqual(['updatedAt', 'ASC']);
    expect(foldersSort).toStrictEqual(['updatedAt', 'ASC']);
  });

  test('when sorting by size, then files are asked by size and folders by name from A to Z', async () => {
    const { filesSort, foldersSort } = await requestWithSort({ type: SortType.Size, direction: SortDirection.Desc });

    expect(filesSort).toStrictEqual(['size', 'DESC']);
    expect(foldersSort).toStrictEqual(['plainName', 'ASC']);
  });
});
