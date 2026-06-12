import { CloudPhotoItem } from 'src/screens/PhotosScreen/types';
import { photosLocalDB } from '../database/photosLocalDB';
import { PhotoAssetFetchService } from '../PhotoAssetFetchService';
import { BurstFetchService } from './BurstFetchService';
import { BurstNativeModule } from './BurstNativeModule';

jest.mock('./BurstNativeModule', () => ({
  BurstNativeModule: {
    getBurstRepresentativeIds: jest.fn(),
    exportBurstMembers: jest.fn(),
    saveBurst: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('src/services/photos/database/photosLocalDB', () => ({
  photosLocalDB: {
    getBurstMembers: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('src/services/photos/PhotoAssetFetchService', () => ({
  PhotoAssetFetchService: {
    fetchUri: jest.fn(),
  },
}));

const mockSaveBurst = BurstNativeModule.saveBurst as jest.MockedFunction<typeof BurstNativeModule.saveBurst>;
const mockGetBurstMembers = photosLocalDB.getBurstMembers as jest.MockedFunction<typeof photosLocalDB.getBurstMembers>;
const mockFetchUri = PhotoAssetFetchService.fetchUri as jest.MockedFunction<typeof PhotoAssetFetchService.fetchUri>;

const makeCloudItem = (overrides: Partial<CloudPhotoItem> = {}): CloudPhotoItem => ({
  id: 'rep-uuid',
  type: 'cloud-only',
  mediaType: 'photo',
  thumbnailPath: null,
  thumbnailBucketId: null,
  thumbnailBucketFile: null,
  thumbnailType: null,
  deviceId: 'device-1',
  createdAt: 1714000000000,
  fileName: 'IMG_1234.heic',
  burstGroupId: 'burst-group-1',
  isBurst: true,
  ...overrides,
});

describe('burst fetch service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('when the item has no burstGroupId, then it returns false without fetching anything', async () => {
    const item = makeCloudItem({ burstGroupId: undefined });
    const controller = new AbortController();

    const result = await BurstFetchService.saveBurstToDevice(item, controller.signal);

    expect(result).toBe(false);
    expect(mockFetchUri).not.toHaveBeenCalled();
  });

  test('when the representative and its members download successfully, then saveBurst receives raw paths without the file:// prefix', async () => {
    mockGetBurstMembers.mockResolvedValue([
      {
        remoteFileId: 'member-uuid-0',
        deviceId: 'device-1',
        createdAt: 1714000000000,
        fileName: 'IMG_1234.burst.0.heic',
        fileSize: null,
        fileId: null,
        thumbnailPath: null,
        thumbnailBucketId: null,
        thumbnailBucketFile: null,
        thumbnailType: null,
        discoveredAt: 1714000000000,
      },
    ]);
    mockFetchUri
      .mockResolvedValueOnce('file:///var/mobile/burst/rep.heic')
      .mockResolvedValueOnce('file:///var/mobile/burst/member0.heic');

    const controller = new AbortController();
    const result = await BurstFetchService.saveBurstToDevice(makeCloudItem(), controller.signal);

    expect(result).toBe(true);
    expect(mockSaveBurst).toHaveBeenCalledWith(['/var/mobile/burst/rep.heic', '/var/mobile/burst/member0.heic']);
  });

  test('when one of the fetched URIs is null, then it returns false without calling saveBurst', async () => {
    mockFetchUri.mockResolvedValueOnce('file:///var/mobile/burst/rep.heic').mockResolvedValueOnce(null);
    mockGetBurstMembers.mockResolvedValue([
      {
        remoteFileId: 'member-uuid-0',
        deviceId: 'device-1',
        createdAt: 1714000000000,
        fileName: 'IMG_1234.burst.0.heic',
        fileSize: null,
        fileId: null,
        thumbnailPath: null,
        thumbnailBucketId: null,
        thumbnailBucketFile: null,
        thumbnailType: null,
        discoveredAt: 1714000000000,
      },
    ]);

    const controller = new AbortController();
    const result = await BurstFetchService.saveBurstToDevice(makeCloudItem(), controller.signal);

    expect(result).toBe(false);
    expect(mockSaveBurst).not.toHaveBeenCalled();
  });

  test('when the signal is aborted after fetching URIs, then it returns false without calling saveBurst', async () => {
    const controller = new AbortController();
    mockFetchUri.mockImplementation(async () => {
      controller.abort();
      return 'file:///var/mobile/burst/rep.heic';
    });

    const result = await BurstFetchService.saveBurstToDevice(makeCloudItem(), controller.signal);

    expect(result).toBe(false);
    expect(mockSaveBurst).not.toHaveBeenCalled();
  });

  test('when no burst members exist in the database, then only the representative is saved', async () => {
    mockGetBurstMembers.mockResolvedValue([]);
    mockFetchUri.mockResolvedValue('file:///var/mobile/burst/rep.heic');

    const controller = new AbortController();
    const result = await BurstFetchService.saveBurstToDevice(makeCloudItem(), controller.signal);

    expect(result).toBe(true);
    expect(mockFetchUri).toHaveBeenCalledTimes(1);
    expect(mockSaveBurst).toHaveBeenCalledWith(['/var/mobile/burst/rep.heic']);
  });
});
