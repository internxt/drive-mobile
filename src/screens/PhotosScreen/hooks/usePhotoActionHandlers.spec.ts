import { act, renderHook } from '@testing-library/react-native';
import { notifications } from 'src/services/NotificationsService';
import { SavePermissionDeniedError } from 'src/services/photos/errors';
import { photoActionsService } from 'src/services/photos/PhotoActionsService';
import { CloudPhotoItem, PhotoItem } from '../types';
import { usePhotoActionHandlers } from './usePhotoActionHandlers';

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

const mockService = photoActionsService as jest.Mocked<typeof photoActionsService>;
const mockNotifications = notifications as jest.Mocked<typeof notifications>;

const makeLocalBacked = (id = 'asset-1'): PhotoItem => ({
  id,
  type: 'local',
  createdAt: 0,
  backupState: 'backed',
  mediaType: 'photo',
  uri: `ph://${id}`,
});

const makeCloudOnly = (id = 'remote-1'): CloudPhotoItem => ({
  id,
  type: 'cloud-only',
  createdAt: 0,
  mediaType: 'photo',
  fileName: 'photo.jpg',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
});

beforeEach(() => {
  jest.clearAllMocks();
  mockService.exportItems.mockResolvedValue(undefined);
  mockService.saveToDevice.mockResolvedValue(undefined);
  mockService.copyToClipboard.mockResolvedValue(undefined);
  mockService.trash.mockResolvedValue(undefined);
  mockService.restoreToCloud.mockResolvedValue(undefined);
});

describe('handleExport', () => {
  test('when export succeeds, then no toast is shown', async () => {
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()] }));

    await act(() => result.current.handleExport());

    expect(mockNotifications.success).not.toHaveBeenCalled();
    expect(mockNotifications.error).not.toHaveBeenCalled();
  });

  test('when export throws, then an error toast is shown', async () => {
    mockService.exportItems.mockRejectedValueOnce(new Error('network error'));
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()] }));

    await act(() => result.current.handleExport());

    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
  });

  test('when called, then onActionEnd runs even if export throws', async () => {
    mockService.exportItems.mockRejectedValueOnce(new Error('fail'));
    const onActionEnd = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onActionEnd }));

    await act(() => result.current.handleExport());

    expect(onActionEnd).toHaveBeenCalledTimes(1);
  });
});

describe('handleSave', () => {
  test('when save succeeds for multiple items, then a success toast is shown for each item', async () => {
    const items = [makeLocalBacked('a'), makeLocalBacked('b')];
    const { result } = renderHook(() => usePhotoActionHandlers({ items }));

    await act(() => result.current.handleSave());

    expect(mockNotifications.success).toHaveBeenCalledTimes(2);
  });

  test('when save throws SavePermissionDeniedError, then the permission-denied toast is shown', async () => {
    mockService.saveToDevice.mockRejectedValueOnce(new SavePermissionDeniedError());
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()] }));

    await act(() => result.current.handleSave());

    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
    expect(mockNotifications.error).toHaveBeenCalledWith(expect.stringContaining('permission'));
  });

  test('when save throws a generic error, then the generic save-error toast is shown', async () => {
    mockService.saveToDevice.mockRejectedValueOnce(new Error('disk full'));
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()] }));

    await act(() => result.current.handleSave());

    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
    expect(mockNotifications.error).not.toHaveBeenCalledWith(expect.stringContaining('permission'));
  });

  test('when save succeeds, then onAfterSave is called once per saved item', async () => {
    const items = [makeLocalBacked('a'), makeLocalBacked('b')];
    const onAfterSave = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePhotoActionHandlers({ items, onAfterSave }));

    await act(() => result.current.handleSave());

    expect(onAfterSave).toHaveBeenCalledTimes(2);
  });

  test('when save throws, then onAfterSave is not called', async () => {
    mockService.saveToDevice.mockRejectedValueOnce(new Error('disk full'));
    const onAfterSave = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onAfterSave }));

    await act(() => result.current.handleSave());

    expect(onAfterSave).not.toHaveBeenCalled();
  });
});

describe('handleCopy', () => {
  test('when there are no items, then no service call is made and no toast is shown', async () => {
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [] }));

    await act(() => result.current.handleCopy());

    expect(mockService.copyToClipboard).not.toHaveBeenCalled();
    expect(mockNotifications.success).not.toHaveBeenCalled();
  });

  test('when copy succeeds, then the photo-copied success toast is shown', async () => {
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()] }));

    await act(() => result.current.handleCopy());

    expect(mockNotifications.success).toHaveBeenCalledTimes(1);
  });

  test('when copy throws, then the copy-error toast is shown', async () => {
    mockService.copyToClipboard.mockRejectedValueOnce(new Error('clipboard error'));
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()] }));

    await act(() => result.current.handleCopy());

    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
    expect(mockNotifications.success).not.toHaveBeenCalled();
  });
});

describe('handleTrashConfirm', () => {
  test('when trash succeeds with a single item, then the singular moved-to-trash toast is shown', async () => {
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeCloudOnly()] }));

    await act(() => result.current.handleTrashConfirm());

    expect(mockNotifications.success).toHaveBeenCalledWith(expect.stringContaining('moved to trash'));
  });

  test('when trash succeeds with multiple items, then the plural moved-to-trash toast is shown', async () => {
    const items = [makeCloudOnly('r1'), makeCloudOnly('r2'), makeCloudOnly('r3')];
    const { result } = renderHook(() => usePhotoActionHandlers({ items }));

    await act(() => result.current.handleTrashConfirm());

    expect(mockNotifications.success).toHaveBeenCalledWith(expect.stringContaining('3 items'));
  });

  test('when trash succeeds, then onAfterTrash is called', async () => {
    const onAfterTrash = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeCloudOnly()], onAfterTrash }));

    await act(() => result.current.handleTrashConfirm());

    expect(onAfterTrash).toHaveBeenCalledTimes(1);
  });

  test('when trash throws, then the trash-error toast is shown and onAfterTrash is not called', async () => {
    mockService.trash.mockRejectedValueOnce(new Error('server error'));
    const onAfterTrash = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeCloudOnly()], onAfterTrash }));

    await act(() => result.current.handleTrashConfirm());

    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
    expect(onAfterTrash).not.toHaveBeenCalled();
  });

  test('when onAfterTrash resolves, then onActionEnd is called after it', async () => {
    const order: string[] = [];
    const onAfterTrash = jest.fn().mockImplementation(async () => order.push('afterTrash'));
    const onActionEnd = jest.fn().mockImplementation(() => order.push('actionEnd'));
    const { result } = renderHook(() =>
      usePhotoActionHandlers({ items: [makeCloudOnly()], onAfterTrash, onActionEnd }),
    );

    await act(() => result.current.handleTrashConfirm());

    expect(order).toEqual(['afterTrash', 'actionEnd']);
  });
});

describe('handleRestore', () => {
  test('when restore succeeds, then onAfterRestore is called', async () => {
    const onAfterRestore = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onAfterRestore }));

    await act(() => result.current.handleRestore());

    expect(onAfterRestore).toHaveBeenCalledTimes(1);
  });

  test('when restore throws, then the restore-error toast is shown and onAfterRestore is not called', async () => {
    mockService.restoreToCloud.mockRejectedValueOnce(new Error('network error'));
    const onAfterRestore = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onAfterRestore }));

    await act(() => result.current.handleRestore());

    expect(mockNotifications.error).toHaveBeenCalledTimes(1);
    expect(onAfterRestore).not.toHaveBeenCalled();
  });

  test('when onAfterRestore resolves, then onActionEnd is called after it', async () => {
    const order: string[] = [];
    const onAfterRestore = jest.fn().mockImplementation(async () => order.push('afterRestore'));
    const onActionEnd = jest.fn().mockImplementation(() => order.push('actionEnd'));
    const { result } = renderHook(() =>
      usePhotoActionHandlers({ items: [makeLocalBacked()], onAfterRestore, onActionEnd }),
    );

    await act(() => result.current.handleRestore());

    expect(order).toEqual(['afterRestore', 'actionEnd']);
  });
});

describe('lifecycle', () => {
  test('when onActionStart is provided, then it is called with a label when an action begins', async () => {
    const onActionStart = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onActionStart }));

    await act(() => result.current.handleCopy());

    expect(onActionStart).toHaveBeenCalledTimes(1);
    expect(onActionStart).toHaveBeenCalledWith(expect.any(String));
  });

  test('when onActionEnd is provided, then it runs in the finally block on success', async () => {
    const onActionEnd = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onActionEnd }));

    await act(() => result.current.handleCopy());

    expect(onActionEnd).toHaveBeenCalledTimes(1);
  });

  test('when onActionEnd is provided, then it runs in the finally block on error', async () => {
    mockService.copyToClipboard.mockRejectedValueOnce(new Error('fail'));
    const onActionEnd = jest.fn();
    const { result } = renderHook(() => usePhotoActionHandlers({ items: [makeLocalBacked()], onActionEnd }));

    await act(() => result.current.handleCopy());

    expect(onActionEnd).toHaveBeenCalledTimes(1);
  });
});
