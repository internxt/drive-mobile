import * as ExpoMediaLibrary from 'expo-media-library';
import { photoMediaLibraryService } from './PhotoMediaLibraryService';

jest.mock('expo-media-library', () => ({
  getAssetInfoAsync: jest.fn(),
  MediaType: { video: 'video', photo: 'photo' },
}));

const mockGetAssetInfoAsync = ExpoMediaLibrary.getAssetInfoAsync as jest.Mock;

const makeAssetInfo = (overrides: Partial<ExpoMediaLibrary.AssetInfo> = {}): ExpoMediaLibrary.AssetInfo =>
  ({
    id: 'ABCD-1234/L0/001',
    filename: 'IMG_1234.MOV',
    mediaType: ExpoMediaLibrary.MediaType.video,
    creationTime: 1_700_000_000_000,
    modificationTime: 1_700_000_000_000,
    duration: 5,
    width: 1920,
    height: 1080,
    uri: 'ph://ABCD-1234/L0/001',
    ...overrides,
  }) as ExpoMediaLibrary.AssetInfo;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getAssetInfo — localUri sanitization', () => {
  test('when the asset has no fragment in its localUri, then localUri is returned as-is', async () => {
    mockGetAssetInfoAsync.mockResolvedValue(makeAssetInfo({ localUri: 'file:///var/mobile/DCIM/IMG_1234.JPG' }));

    const result = await photoMediaLibraryService.getAssetInfo('ABCD-1234/L0/001');

    expect(result.localUri).toBe('file:///var/mobile/DCIM/IMG_1234.JPG');
  });

  test('when a video asset has a binary-plist fragment in its localUri, then the fragment is stripped', async () => {
    const fragmentedUri =
      'file:///var/mobile/Media/DCIM/104APPLE/IMG_4854.MOV#YnBsaXN0MDDRAQJfEBtSZWNvbW1lbmRlZEZvckltbWVyc2l2ZU1vZGU';
    mockGetAssetInfoAsync.mockResolvedValue(makeAssetInfo({ localUri: fragmentedUri }));

    const result = await photoMediaLibraryService.getAssetInfo('ABCD-1234/L0/001');

    expect(result.localUri).toBe('file:///var/mobile/Media/DCIM/104APPLE/IMG_4854.MOV');
  });

  test('when the asset has no localUri, then the result is returned unchanged', async () => {
    mockGetAssetInfoAsync.mockResolvedValue(makeAssetInfo({ localUri: undefined }));

    const result = await photoMediaLibraryService.getAssetInfo('ABCD-1234/L0/001');

    expect(result.localUri).toBeUndefined();
  });

  test('when the asset info contains other fields, then they are preserved alongside the sanitized localUri', async () => {
    const fragmentedUri = 'file:///var/mobile/DCIM/IMG_4854.MOV#SomeFragment';
    mockGetAssetInfoAsync.mockResolvedValue(makeAssetInfo({ localUri: fragmentedUri, filename: 'IMG_4854.MOV' }));

    const result = await photoMediaLibraryService.getAssetInfo('ABCD-1234/L0/001');

    expect(result.filename).toBe('IMG_4854.MOV');
    expect(result.localUri).toBe('file:///var/mobile/DCIM/IMG_4854.MOV');
  });
});
