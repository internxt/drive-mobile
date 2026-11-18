import { openHostApp } from 'expo-share-extension';

import { AppGroupPendingShareService } from '../../services/AppGroupPendingShareService';
import errorService from '../../services/ErrorService';
import { SharedFile } from '../types';
import { savePendingShareAndOpenLogin } from './pendingShareLogin';

jest.mock('expo-share-extension', () => ({ openHostApp: jest.fn() }));
jest.mock('../../navigation/AppLinks', () => ({ AppPaths: { signIn: () => 'sign-in' } }));
jest.mock('../../services/AppGroupPendingShareService', () => ({
  AppGroupPendingShareService: { update: jest.fn() },
}));
jest.mock('../../services/ErrorService', () => ({ __esModule: true, default: { reportError: jest.fn() } }));

const NOW_MS = 1_700_000_000_000;
const PHOTO_SIZE_BYTES = 2048;

const mockOpenHostApp = openHostApp as jest.Mock;
const mockUpdate = AppGroupPendingShareService.update as jest.Mock;
const mockReportError = errorService.reportError as jest.Mock;

const sharedPhoto: SharedFile = {
  uri: 'file:///group/sharedData/photo.jpg',
  mimeType: 'image/jpeg',
  fileName: 'photo.jpg',
  size: PHOTO_SIZE_BYTES,
};

describe('Opening sign in from the share screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  test('when a signed-out user taps sign in, then the shared files are saved before the sign in screen opens', async () => {
    const callOrder: string[] = [];
    mockUpdate.mockImplementation(async () => {
      callOrder.push('save');
    });
    mockOpenHostApp.mockImplementation(() => {
      callOrder.push('open');
    });

    await savePendingShareAndOpenLogin([sharedPhoto]);

    expect(mockUpdate).toHaveBeenCalledWith({
      files: [{ uri: sharedPhoto.uri, name: 'photo.jpg', size: PHOTO_SIZE_BYTES }],
      timestamp: NOW_MS,
    });
    expect(mockOpenHostApp).toHaveBeenCalledWith('sign-in');
    expect(callOrder).toEqual(['save', 'open']);
  });

  test('when a shared file has no name, then it is left out of the saved files', async () => {
    mockUpdate.mockResolvedValue(undefined);

    await savePendingShareAndOpenLogin([{ ...sharedPhoto, fileName: null }, sharedPhoto]);

    expect(mockUpdate).toHaveBeenCalledWith({
      files: [{ uri: sharedPhoto.uri, name: 'photo.jpg', size: PHOTO_SIZE_BYTES }],
      timestamp: NOW_MS,
    });
  });

  test('when saving the shared files fails, then the sign in screen still opens', async () => {
    const saveError = new Error('write failed');
    mockUpdate.mockRejectedValue(saveError);

    await savePendingShareAndOpenLogin([sharedPhoto]);

    expect(mockReportError).toHaveBeenCalledWith(saveError, expect.anything());
    expect(mockOpenHostApp).toHaveBeenCalledWith('sign-in');
  });
});
