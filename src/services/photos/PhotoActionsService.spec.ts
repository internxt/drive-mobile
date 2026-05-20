import * as RNFS from '@dr.pogodin/react-native-fs';
import * as Clipboard from 'expo-clipboard';
import * as MediaLibrary from 'expo-media-library';
import { PhotoItem } from 'src/screens/PhotosScreen/types';
import fileSystemService from 'src/services/FileSystemService';
import { photoActionsService } from './PhotoActionsService';
import { PhotoAssetFetchService } from './PhotoAssetFetchService';

jest.mock('./PhotoAssetFetchService', () => ({
  PhotoAssetFetchService: {
    resolveExportUri: jest.fn(),
    fetchUri: jest.fn(),
  },
}));

jest.mock('src/services/FileSystemService', () => ({
  __esModule: true,
  default: { shareFile: jest.fn(), getCacheDir: jest.fn(() => '/cache') },
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock('@dr.pogodin/react-native-fs', () => ({
  readFile: jest.fn(),
}));

jest.mock('expo-clipboard', () => ({
  setImageAsync: jest.fn(),
}));

jest.mock('src/services/common', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockResolveExportUri = PhotoAssetFetchService.resolveExportUri as jest.Mock;
const mockFetchUri = PhotoAssetFetchService.fetchUri as jest.Mock;
const mockShareFile = fileSystemService.shareFile as jest.Mock;
const mockRequestPermissions = MediaLibrary.requestPermissionsAsync as jest.Mock;
const mockSaveToLibrary = MediaLibrary.saveToLibraryAsync as jest.Mock;
const mockReadFile = RNFS.readFile as jest.Mock;
const mockSetImage = Clipboard.setImageAsync as jest.Mock;

const makeLocalItem = (id = 'asset-1'): PhotoItem => ({
  id,
  type: 'local',
  uri: `ph://${id}`,
  mediaType: 'photo',
  createdAt: Date.now(),
  backupState: 'backed',
});

const makeSignal = () => new AbortController().signal;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('exportItems', () => {
  test('when resolveExportUri returns null, then shareFile is not called', async () => {
    mockResolveExportUri.mockResolvedValue(null);

    await photoActionsService.exportItems([makeLocalItem()], makeSignal());

    expect(mockShareFile).not.toHaveBeenCalled();
  });

  test('when resolveExportUri returns a URI, then shareFile is called with the file URI', async () => {
    mockResolveExportUri.mockResolvedValue({ uri: '/cache/photo_share/asset-1.jpg' });

    await photoActionsService.exportItems([makeLocalItem()], makeSignal());

    expect(mockShareFile).toHaveBeenCalledWith({ title: '', fileUri: 'file:///cache/photo_share/asset-1.jpg' });
  });

  test('when resolveExportUri returns a cleanup callback, then cleanup is called even if shareFile throws', async () => {
    const cleanup = jest.fn();
    mockResolveExportUri.mockResolvedValue({ uri: '/cache/photo_share/asset-1.jpg', cleanup });
    mockShareFile.mockRejectedValue(new Error('share failed'));

    await photoActionsService.exportItems([makeLocalItem()], makeSignal());

    expect(cleanup).toHaveBeenCalled();
  });

  test('when signal is already aborted, then resolveExportUri is not called', async () => {
    const controller = new AbortController();
    controller.abort();

    await photoActionsService.exportItems([makeLocalItem()], controller.signal);

    expect(mockResolveExportUri).not.toHaveBeenCalled();
  });

  test('when processing multiple items, then each item is exported in sequence', async () => {
    const items = [makeLocalItem('a'), makeLocalItem('b')];
    mockResolveExportUri.mockResolvedValueOnce({ uri: '/cache/a.jpg' }).mockResolvedValueOnce({ uri: '/cache/b.jpg' });

    await photoActionsService.exportItems(items, makeSignal());

    expect(mockShareFile).toHaveBeenCalledTimes(2);
  });
});

describe('saveToDevice', () => {
  test('when media library permission is denied, then saveToLibraryAsync is not called', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });

    await photoActionsService.saveToDevice(makeLocalItem(), makeSignal());

    expect(mockSaveToLibrary).not.toHaveBeenCalled();
  });

  test('when fetchUri returns null, then saveToLibraryAsync is not called', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockFetchUri.mockResolvedValue(null);

    await photoActionsService.saveToDevice(makeLocalItem(), makeSignal());

    expect(mockSaveToLibrary).not.toHaveBeenCalled();
  });

  test('when permission is granted and URI is resolved, then saveToLibraryAsync is called with the file URI', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockFetchUri.mockResolvedValue('file:///cache/photo.jpg');

    await photoActionsService.saveToDevice(makeLocalItem(), makeSignal());

    expect(mockSaveToLibrary).toHaveBeenCalledWith('file:///cache/photo.jpg');
  });

  test('when saveToLibraryAsync throws, then the error is re-thrown', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockFetchUri.mockResolvedValue('file:///cache/photo.jpg');
    mockSaveToLibrary.mockRejectedValue(new Error('disk full'));

    await expect(photoActionsService.saveToDevice(makeLocalItem(), makeSignal())).rejects.toThrow('disk full');
  });
});

describe('copyToClipboard', () => {
  test('when fetchUri returns null, then setImageAsync is not called', async () => {
    mockFetchUri.mockResolvedValue(null);

    await photoActionsService.copyToClipboard(makeLocalItem(), makeSignal());

    expect(mockSetImage).not.toHaveBeenCalled();
  });

  test('when fetchUri returns a file URI, then readFile is called with the stripped path', async () => {
    mockFetchUri.mockResolvedValue('file:///cache/photo.jpg');
    mockReadFile.mockResolvedValue('base64data');

    await photoActionsService.copyToClipboard(makeLocalItem(), makeSignal());

    expect(mockReadFile).toHaveBeenCalledWith('/cache/photo.jpg', 'base64');
    expect(mockSetImage).toHaveBeenCalledWith('base64data');
  });

  test('when readFile throws, then the error is re-thrown', async () => {
    mockFetchUri.mockResolvedValue('file:///cache/photo.jpg');
    mockReadFile.mockRejectedValue(new Error('read error'));

    await expect(photoActionsService.copyToClipboard(makeLocalItem(), makeSignal())).rejects.toThrow('read error');
  });
});
