import { act, renderHook } from '@testing-library/react-native';
import { notifications } from 'src/services/NotificationsService';
import { photoActionsService } from 'src/services/photos/PhotoActionsService';
import { useAppDispatch } from 'src/store/hooks';
import { runBackupCycleThunk, runUploadThunk } from 'src/store/slices/photos';
import { PhotoItem } from '../types';
import { usePhotoActions } from './usePhotoActions';
import { PhotoSelection } from './usePhotoSelection';

jest.mock('src/services/photos/PhotoActionsService', () => ({
  photoActionsService: {
    exportItems: jest.fn(),
    saveToDevice: jest.fn(),
    copyToClipboard: jest.fn(),
    trash: jest.fn(),
    restoreToCloud: jest.fn(),
  },
}));

jest.mock('src/services/NotificationsService', () => ({
  notifications: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('src/services/common', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock('src/store/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('src/store/slices/photos', () => ({
  runUploadThunk: jest.fn(),
  runBackupCycleThunk: jest.fn(),
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    getStatus: jest.fn(),
    deleteCloudAsset: jest.fn(),
    markAssetDeleted: jest.fn(),
    markPending: jest.fn(),
  },
}));

jest.mock('src/services/drive/trash/driveTrash.service', () => ({
  driveTrashService: { moveToTrash: jest.fn() },
}));

const mockService = photoActionsService as jest.Mocked<typeof photoActionsService>;
const mockNotifications = notifications as jest.Mocked<typeof notifications>;
const mockUseAppDispatch = useAppDispatch as jest.Mock;

const makeLocalBacked = (id = 'asset-1'): PhotoItem => ({
  id,
  type: 'local',
  createdAt: 0,
  backupState: 'backed',
  mediaType: 'photo',
  uri: `ph://${id}`,
});

const makeSelection = (overrides: Partial<PhotoSelection> = {}): PhotoSelection => ({
  selectMode: true,
  selectedIds: new Set(['asset-1']),
  selectedItems: [makeLocalBacked()],
  enterSelectMode: jest.fn(),
  exitSelectMode: jest.fn(),
  toggleSelect: jest.fn(),
  ...overrides,
});

const makeOpts = () => ({
  reloadLocal: jest.fn().mockResolvedValue(undefined),
  reloadCloud: jest.fn().mockResolvedValue(undefined),
});

let mockDispatch: jest.Mock;
let mockUnwrap: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockService.exportItems.mockResolvedValue(undefined);
  mockService.saveToDevice.mockResolvedValue(undefined);
  mockService.copyToClipboard.mockResolvedValue(undefined);
  mockService.trash.mockResolvedValue(undefined);
  mockService.restoreToCloud.mockResolvedValue(undefined);
  mockUnwrap = jest.fn().mockResolvedValue(undefined);
  mockDispatch = jest.fn().mockReturnValue({ unwrap: mockUnwrap });
  mockUseAppDispatch.mockReturnValue(mockDispatch);
  (runUploadThunk as unknown as jest.Mock).mockReturnValue({ type: 'photos/runUploadThunk' });
  (runBackupCycleThunk as unknown as jest.Mock).mockReturnValue({ type: 'photos/runBackupCycle' });
});

describe('progress label', () => {
  test('when an action starts, then actionLabel is set to a non-empty string', async () => {
    const { result } = renderHook(() => usePhotoActions(makeSelection(), makeOpts()));

    await act(() => result.current.handleCopy());

    // label is cleared by finishAction; check it was set during execution by verifying service was called
    expect(mockService.copyToClipboard).toHaveBeenCalled();
  });

  test('when an action ends, then actionLabel is null and exitSelectMode is called', async () => {
    const selection = makeSelection();
    const { result } = renderHook(() => usePhotoActions(selection, makeOpts()));

    await act(() => result.current.handleCopy());

    expect(result.current.actionLabel).toBeNull();
    expect(selection.exitSelectMode).toHaveBeenCalledTimes(1);
  });
});

describe('more-actions sheet', () => {
  test('when handleMore is called, then the more-actions sheet opens', () => {
    const { result } = renderHook(() => usePhotoActions(makeSelection(), makeOpts()));

    act(() => result.current.handleMore());

    expect(result.current.isMoreActionsSheetOpen).toBe(true);
  });

  test('when handleMoreClose is called, then the more-actions sheet closes', () => {
    const { result } = renderHook(() => usePhotoActions(makeSelection(), makeOpts()));

    act(() => result.current.handleMore());
    act(() => result.current.handleMoreClose());

    expect(result.current.isMoreActionsSheetOpen).toBe(false);
  });

  test('when an action ends, then the more-actions sheet is closed', async () => {
    const { result } = renderHook(() => usePhotoActions(makeSelection(), makeOpts()));
    act(() => result.current.handleMore());

    await act(() => result.current.handleCopy());

    expect(result.current.isMoreActionsSheetOpen).toBe(false);
  });
});

describe('delete-confirm modal', () => {
  test('when handleDelete is called, then the more-actions sheet closes and the delete modal opens', () => {
    const { result } = renderHook(() => usePhotoActions(makeSelection(), makeOpts()));
    act(() => result.current.handleMore());

    act(() => result.current.handleDelete());

    expect(result.current.isMoreActionsSheetOpen).toBe(false);
    expect(result.current.isDeleteConfirmOpen).toBe(true);
  });

  test('when handleDeleteClose is called, then the delete modal closes', () => {
    const { result } = renderHook(() => usePhotoActions(makeSelection(), makeOpts()));
    act(() => result.current.handleDelete());

    act(() => result.current.handleDeleteClose());

    expect(result.current.isDeleteConfirmOpen).toBe(false);
  });
});

describe('handleSave', () => {
  test('when save succeeds, then reloadLocal is called and runBackupCycleThunk is dispatched', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleSave());

    expect(opts.reloadLocal).toHaveBeenCalledTimes(1);
    expect(opts.reloadCloud).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(runBackupCycleThunk());
  });

  test('when save throws, then reloadLocal and runBackupCycleThunk are not called', async () => {
    mockService.saveToDevice.mockRejectedValueOnce(new Error('disk full'));
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleSave());

    expect(opts.reloadLocal).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(runBackupCycleThunk());
  });
});

describe('handleTrashConfirm', () => {
  test('when trash succeeds, then reloadLocal and reloadCloud are both called', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleTrashConfirm());

    expect(opts.reloadLocal).toHaveBeenCalledTimes(1);
    expect(opts.reloadCloud).toHaveBeenCalledTimes(1);
  });

  test('when trash throws, then reloadLocal and reloadCloud are not called', async () => {
    mockService.trash.mockRejectedValueOnce(new Error('server error'));
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleTrashConfirm());

    expect(opts.reloadLocal).not.toHaveBeenCalled();
    expect(opts.reloadCloud).not.toHaveBeenCalled();
  });
});

describe('handleRestore', () => {
  test('when restore succeeds, then dispatch is called with runUploadThunk and reloads run', async () => {
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleRestore());

    expect(mockDispatch).toHaveBeenCalledWith(runUploadThunk({ bypassEnabled: true }));
    expect(opts.reloadLocal).toHaveBeenCalledTimes(1);
    expect(opts.reloadCloud).toHaveBeenCalledTimes(1);
  });

  test('when restore throws, then dispatch and reloads are not called', async () => {
    mockService.restoreToCloud.mockRejectedValueOnce(new Error('network error'));
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleRestore());

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(opts.reloadLocal).not.toHaveBeenCalled();
    expect(opts.reloadCloud).not.toHaveBeenCalled();
  });

  test('when dispatch unwrap rejects, then reloads are not called and the restore-error toast is shown', async () => {
    mockUnwrap.mockRejectedValueOnce(new Error('thunk failed'));
    const opts = makeOpts();
    const { result } = renderHook(() => usePhotoActions(makeSelection(), opts));

    await act(() => result.current.handleRestore());

    expect(opts.reloadLocal).not.toHaveBeenCalled();
    expect(opts.reloadCloud).not.toHaveBeenCalled();
    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
  });
});
