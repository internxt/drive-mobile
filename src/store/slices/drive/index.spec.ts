import type { RootState } from '../..';
import { driveSelectors } from './index';

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@internxt-mobile/services/drive', () => ({ __esModule: true, default: {} }));
jest.mock('src/helpers', () => ({
  checkIsFolder: (item: { fileId?: string }) => !item.fileId,
  isValidFilename: jest.fn(),
  mapRecentFile: jest.fn(),
}));
jest.mock('src/services/AuthService', () => ({ __esModule: true, default: {} }));
jest.mock('src/services/ErrorService', () => ({ __esModule: true, default: {} }));
jest.mock('src/services/native/InternxtSignalingModule', () => ({ notifyParentChanged: jest.fn() }));
jest.mock('../../../services/AnalyticsService', () => ({ __esModule: true, default: {} }));
jest.mock('../../../services/FileSystemService', () => ({ __esModule: true, default: {} }));
jest.mock('../../../services/NotificationsService', () => ({ __esModule: true, default: {} }));

const aFolder = { id: 1, name: 'Documents' };
const aFile = { id: 2, name: 'Invoice', fileId: 'file-2' };
const anUpload = { id: 3, name: 'Photo', progress: 0.4 };

const aStateWith = ({
  drive = {},
  ui = {},
}: {
  drive?: Record<string, unknown>;
  ui?: Record<string, unknown>;
} = {}): RootState =>
  ({
    auth: { user: { bucket: 'the-bucket' } },
    drive: { folderContent: [aFile, aFolder], uploadingFiles: [anUpload], searchString: '', currentFolderId: 7, ...drive },
    ui: { showUploadModal: false, ...ui },
  }) as unknown as RootState;

describe('Listing the items of the open Drive folder', () => {
  test('when the folder has files and folders, then the folders come first and the uploads are listed apart', () => {
    const { items, uploading } = driveSelectors.driveItems(aStateWith());

    expect(items.map((item) => item.data.name)).toEqual(['Documents', 'Invoice']);
    expect(uploading.map((item) => item.data.name)).toEqual(['Photo']);
  });

  test('when something unrelated to Drive changes, then the same list is handed back instead of a new one', () => {
    const drive = aStateWith().drive;
    const auth = aStateWith().auth;
    const before = { ...aStateWith(), drive, auth } as RootState;
    const afterAnUnrelatedChange = { ...aStateWith({ ui: { showUploadModal: true } }), drive, auth } as RootState;

    expect(driveSelectors.driveItems(afterAnUnrelatedChange)).toBe(driveSelectors.driveItems(before));
  });

  test('when an upload makes progress, then a new list reflects it', () => {
    const before = aStateWith();
    const itemsBefore = driveSelectors.driveItems(before);

    const itemsAfter = driveSelectors.driveItems({
      ...before,
      drive: { ...before.drive, uploadingFiles: [{ ...anUpload, progress: 0.9 }] },
    } as unknown as RootState);

    expect(itemsAfter).not.toBe(itemsBefore);
    expect(itemsAfter.uploading[0].progress).toBe(0.9);
  });

  test('when the user searches, then only the items whose name matches are listed', () => {
    const { items } = driveSelectors.driveItems(aStateWith({ drive: { searchString: 'invo' } }));

    expect(items.map((item) => item.data.name)).toEqual(['Invoice']);
  });
});
