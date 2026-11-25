import drive from '@internxt-mobile/services/drive';
import { DriveItemData } from '@internxt-mobile/types/drive/item';
import { useNavigation } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-native';
import type { AppDispatch } from '../../store';
import { useAppDispatch } from '../../store/hooks';
import { driveActions, driveThunks } from '../../store/slices/drive';
import { startFilePreview, useOpenFilePreview } from './useOpenFilePreview';

jest.mock('@internxt-mobile/services/drive', () => ({
  __esModule: true,
  default: { events: { setDownloadAbort: jest.fn() } },
}));

jest.mock('../../store/slices/drive', () => ({
  driveActions: {
    setFocusedItem: jest.fn((payload) => ({ type: 'drive/setFocusedItem', payload })),
  },
  driveThunks: {
    downloadFileThunk: jest.fn((args) => ({ type: 'drive/downloadFile', args })),
  },
}));

jest.mock('../../store/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const setDownloadAbortMock = drive.events.setDownloadAbort as jest.Mock;
const setFocusedItemMock = driveActions.setFocusedItem as unknown as jest.Mock;
const downloadFileThunkMock = driveThunks.downloadFileThunk as unknown as jest.Mock;
const useAppDispatchMock = useAppDispatch as jest.Mock;
const useNavigationMock = useNavigation as jest.Mock;

const thumbnail = { bucket_file: 'thumbnail-file', bucket_id: 'thumbnail-bucket', type: 'png' };

const driveFile: DriveItemData = {
  name: 'Test File',
  uuid: 'file-uuid',
  plainName: 'Test File',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  isFolder: false,
  folderUuid: 'folder-uuid',
  fileId: 'file-id',
  type: 'png',
  size: 1024,
  bucket: 'bucket-id',
  thumbnails: [thumbnail] as unknown as DriveItemData['thumbnails'],
};

const arrangeDispatch = () => {
  const downloadPromise = { abort: jest.fn(), then: jest.fn() };
  const dispatch = jest.fn((action: { type: string }) => {
    if (action.type === 'drive/downloadFile') {
      return downloadPromise;
    }
    return action;
  });

  return { dispatch: dispatch as unknown as AppDispatch, dispatchMock: dispatch, downloadPromise };
};

describe('starting the preview of a file', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a file is opened, then it is focused with all its data, including its thumbnails', () => {
    const { dispatch } = arrangeDispatch();

    startFilePreview(dispatch, driveFile);

    expect(setFocusedItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'file-uuid',
        name: 'Test File',
        folderUuid: 'folder-uuid',
        bucket: 'bucket-id',
        thumbnails: [thumbnail],
      }),
    );
  });

  test('when a file without folder or bucket is opened, then those fields are left empty instead of null', () => {
    const { dispatch } = arrangeDispatch();

    startFilePreview(dispatch, { ...driveFile, folderUuid: null, bucket: null });

    const focusedItem = setFocusedItemMock.mock.calls[0][0];
    expect(focusedItem.folderUuid).toBeUndefined();
    expect(focusedItem.bucket).toBeUndefined();
  });

  test('when a file is opened, then its download starts without opening the system file viewer', () => {
    const { dispatch } = arrangeDispatch();

    startFilePreview(dispatch, driveFile);

    expect(downloadFileThunkMock).toHaveBeenCalledWith({
      uuid: 'file-uuid',
      size: 1024,
      bucketId: 'bucket-id',
      folderUuid: 'folder-uuid',
      name: 'Test File',
      type: 'png',
      fileId: 'file-id',
      updatedAt: '2026-01-02T10:00:00.000Z',
      openFileViewer: false,
    });
  });

  test('when the file is focused, then this happens before its download starts', () => {
    const { dispatch, dispatchMock } = arrangeDispatch();

    startFilePreview(dispatch, driveFile);

    const dispatchedTypes = dispatchMock.mock.calls.map(([action]) => action.type);
    expect(dispatchedTypes).toEqual(['drive/setFocusedItem', 'drive/downloadFile']);
  });

  test('when the preview download is cancelled, then the download of that file is aborted', () => {
    const { dispatch, downloadPromise } = arrangeDispatch();

    startFilePreview(dispatch, driveFile);
    const registeredAbort = setDownloadAbortMock.mock.calls[0][0];
    registeredAbort();

    expect(downloadPromise.abort).toHaveBeenCalledTimes(1);
  });

  test('when a file is opened, then the running download is returned so it can be awaited', () => {
    const { dispatch, downloadPromise } = arrangeDispatch();

    const returnedDownloadPromise = startFilePreview(dispatch, driveFile);

    expect(returnedDownloadPromise).toBe(downloadPromise);
  });
});

describe('opening the preview of a file', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('when a file is opened from a list, then the preview screen opens after its download starts', () => {
    const { dispatch, downloadPromise } = arrangeDispatch();
    const navigate = jest.fn();
    useAppDispatchMock.mockReturnValue(dispatch);
    useNavigationMock.mockReturnValue({ navigate });

    const { result } = renderHook(() => useOpenFilePreview());
    const returnedDownloadPromise = result.current(driveFile);

    expect(downloadFileThunkMock).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('DrivePreview');
    expect(returnedDownloadPromise).toBe(downloadPromise);
  });
});
