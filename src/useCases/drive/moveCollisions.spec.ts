import drive from '@internxt-mobile/services/drive';
import { MovableItem } from './move';
import { applyCollisionAction, findMoveCollisions, MoveCollisionAction, resolveMoveCollisions } from './moveCollisions';

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: {
    folder: { checkDuplicatedFolders: jest.fn() },
    file: { checkFileExistence: jest.fn() },
    trash: { moveToTrash: jest.fn().mockResolvedValue(undefined) },
  },
}));

const DESTINATION_FOLDER_UUID = 'destination-folder';
const EXISTENCE_CHECK_LIMIT = 200;
const TRASH_REQUEST_LIMIT = 50;

const invoicesFolder: MovableItem = { uuid: 'folder-1', name: 'Invoices', isFolder: true };
const photosFolder: MovableItem = { uuid: 'folder-2', name: 'Photos', isFolder: true };
const reportFile: MovableItem = { uuid: 'file-1', name: 'report', type: 'pdf', isFolder: false };
const notesFile: MovableItem = { uuid: 'file-2', name: 'notes', type: 'txt', isFolder: false };

const mockDestinationFolders = (names: string[]) => {
  jest.mocked(drive.folder.checkDuplicatedFolders).mockImplementation(
    async (_parentFolderUuid, requestedNames) =>
      ({
        existentFolders: requestedNames
          .filter((name) => names.includes(name))
          .map((name) => ({ uuid: `existing-${name}`, plainName: name })),
      }) as never,
  );
};

const mockDestinationFiles = (files: { plainName: string; type: string }[]) => {
  jest.mocked(drive.file.checkFileExistence).mockImplementation(
    async (_parentFolderUuid, requestedFiles) =>
      ({
        existentFiles: requestedFiles
          .filter((requested) =>
            files.some((file) => file.plainName === requested.plainName && file.type === requested.type),
          )
          .map((file) => ({
            uuid: `existing-${file.plainName}.${file.type}`,
            plainName: file.plainName,
            type: file.type,
          })),
      }) as never,
  );
};

describe('Finding name collisions before a move', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationFolders([]);
    mockDestinationFiles([]);
  });

  test('when a folder and a file already exist in the destination, then both are returned with the existing items', async () => {
    mockDestinationFolders(['Invoices']);
    mockDestinationFiles([{ plainName: 'report', type: 'pdf' }]);

    const collisions = await findMoveCollisions(
      [invoicesFolder, photosFolder, reportFile, notesFile],
      DESTINATION_FOLDER_UUID,
    );

    expect(collisions).toStrictEqual([
      { item: invoicesFolder, existingItemUuid: 'existing-Invoices' },
      { item: reportFile, existingItemUuid: 'existing-report.pdf' },
    ]);
  });

  test('when a file has the same name but another extension, then it does not collide', async () => {
    mockDestinationFiles([{ plainName: 'report', type: 'docx' }]);

    const collisions = await findMoveCollisions([reportFile], DESTINATION_FOLDER_UUID);

    expect(collisions).toStrictEqual([]);
  });

  test('when more folders are moved than one check accepts, then the names are checked in several requests', async () => {
    const manyFolders = Array.from({ length: EXISTENCE_CHECK_LIMIT + 1 }, (_, index) => ({
      uuid: `folder-${index}`,
      name: `Folder ${index}`,
      isFolder: true,
    }));

    await findMoveCollisions(manyFolders, DESTINATION_FOLDER_UUID);

    expect(drive.folder.checkDuplicatedFolders).toHaveBeenCalledTimes(2);
    expect(jest.mocked(drive.folder.checkDuplicatedFolders).mock.calls[1][1]).toStrictEqual([
      `Folder ${EXISTENCE_CHECK_LIMIT}`,
    ]);
  });
});

describe('Choosing what to do with each collision', () => {
  const collisions = [
    { item: invoicesFolder, existingItemUuid: 'existing-Invoices' },
    { item: reportFile, existingItemUuid: 'existing-report.pdf' },
  ];

  test('when the user decides on one collision, then only that one is decided and the next one is still pending', () => {
    const actionsByUuid = applyCollisionAction({
      pendingCollisions: collisions,
      actionsByUuid: new Map(),
      action: 'replace',
      shouldApplyToAll: false,
    });

    expect([...actionsByUuid]).toStrictEqual([['folder-1', 'replace']]);
  });

  test('when the user applies the action to all, then no collision is left to ask about', () => {
    const actionsByUuid = applyCollisionAction({
      pendingCollisions: collisions,
      actionsByUuid: new Map(),
      action: 'keep-both',
      shouldApplyToAll: true,
    });

    expect([...actionsByUuid]).toStrictEqual([
      ['folder-1', 'keep-both'],
      ['file-1', 'keep-both'],
    ]);
  });
});

describe('Resolving the collisions of a move', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationFolders([]);
    mockDestinationFiles([]);
  });

  const resolveWithActions = async (items: MovableItem[], actions: [string, MoveCollisionAction][]) =>
    resolveMoveCollisions({
      items,
      collisions: actions.map(([uuid]) => ({
        item: items.find((item) => item.uuid === uuid) as MovableItem,
        existingItemUuid: `existing-${uuid}`,
      })),
      actionsByUuid: new Map(actions),
      destinationFolderUuid: DESTINATION_FOLDER_UUID,
    }).then(({ finalItemsToMove }) => finalItemsToMove);

  test('when an item replaces the existing one, then the existing item goes to trash and the item keeps its name', async () => {
    const itemsToMove = await resolveWithActions([invoicesFolder, reportFile], [['file-1', 'replace']]);

    expect(drive.trash.moveToTrash).toHaveBeenCalledWith([{ uuid: 'existing-file-1', type: 'file' }]);
    expect(itemsToMove).toStrictEqual([invoicesFolder, reportFile]);
  });

  test('when an item is skipped, then it is left out of the move and nothing goes to trash', async () => {
    const itemsToMove = await resolveWithActions([invoicesFolder, reportFile], [['folder-1', 'skip']]);

    expect(drive.trash.moveToTrash).not.toHaveBeenCalled();
    expect(itemsToMove).toStrictEqual([reportFile]);
  });

  test('when both are kept, then the moved folder and file get the first free name in the destination', async () => {
    mockDestinationFolders(['Invoices']);
    mockDestinationFiles([{ plainName: 'report', type: 'pdf' }]);

    const itemsToMove = await resolveWithActions(
      [invoicesFolder, reportFile],
      [
        ['folder-1', 'keep-both'],
        ['file-1', 'keep-both'],
      ],
    );

    expect(itemsToMove).toStrictEqual([
      { ...invoicesFolder, newName: 'Invoices (1)' },
      { ...reportFile, newName: 'report (1)' },
    ]);
  });

  test('when a name check fails, then nothing goes to trash', async () => {
    jest.mocked(drive.folder.checkDuplicatedFolders).mockRejectedValueOnce(new Error('network'));

    await expect(
      resolveWithActions(
        [invoicesFolder, reportFile],
        [
          ['folder-1', 'keep-both'],
          ['file-1', 'replace'],
        ],
      ),
    ).rejects.toThrow('network');
    expect(drive.trash.moveToTrash).not.toHaveBeenCalled();
  });

  test('when more items are replaced than one trash request accepts, then they go to trash in several requests', async () => {
    const manyFiles = Array.from({ length: TRASH_REQUEST_LIMIT + 1 }, (_, index) => ({
      uuid: `file-${index}`,
      name: `File ${index}`,
      type: 'txt',
      isFolder: false,
    }));

    const { trashedDestinationItemUuids } = await resolveMoveCollisions({
      items: manyFiles,
      collisions: manyFiles.map((file) => ({ item: file, existingItemUuid: `existing-${file.uuid}` })),
      actionsByUuid: new Map(manyFiles.map((file) => [file.uuid, 'replace'])),
      destinationFolderUuid: DESTINATION_FOLDER_UUID,
    });

    expect(drive.trash.moveToTrash).toHaveBeenCalledTimes(2);
    expect(trashedDestinationItemUuids).toHaveLength(TRASH_REQUEST_LIMIT + 1);
  });

  test('when the free name belongs to another item of the same move, then the kept item gets the next one', async () => {
    const numberedFolder: MovableItem = { uuid: 'folder-3', name: 'Invoices (1)', isFolder: true };
    mockDestinationFolders(['Invoices']);

    const itemsToMove = await resolveWithActions([invoicesFolder, numberedFolder], [['folder-1', 'keep-both']]);

    expect(itemsToMove).toStrictEqual([{ ...invoicesFolder, newName: 'Invoices (2)' }, numberedFolder]);
  });
});
