import { PhotosSyncManager } from '../../../../../src/services/photos/sync/photosSyncManager/photosSyncManager';
import { PhotosSyncManagerStatus } from '../../../../../src/types/photos';
import { getAssetsAsync } from 'expo-media-library';
import { PhotosNetworkManager } from '../../../../../src/services/photos/network/PhotosNetworkManager';
import { SdkManagerMock } from '__tests__/unit/mocks/sdkManager';
import { createDevicePhotoFixture, createPhotoFixture } from '__tests__/unit/fixtures/photos.fixture';
import { PhotosLocalDB } from '../../database';
import { DevicePhotosSyncCheckerService } from '../devicePhotosSyncChecker';

jest.mock('expo-media-library');
jest.mock('');
const mockedGetAssetsAsync = jest.mocked(getAssetsAsync, true);

describe('PhotosSyncManager', () => {
  const initialDbMock = {
    init: jest.fn(),
    persistPhotoSync: jest.fn(),
    getByPhotoRef: jest.fn(),
    clear: jest.fn(),
    getByDevicePhoto: jest.fn(),
    getByPhoto: jest.fn(),
    getSyncedPhotoByName: jest.fn(),
    getByPreviewUri: jest.fn(),
    getAll: jest.fn(),
    isInitialized: true,
  } as any;
  const db: PhotosLocalDB = initialDbMock;

  let photosNetworkManager: PhotosNetworkManager;
  let devicePhotosSyncChecker: DevicePhotosSyncCheckerService;
  let subject: PhotosSyncManager;
  beforeEach(() => {
    Object.keys(db).forEach((key) => {
      (db as any)[key] = jest.fn();
    });

    photosNetworkManager = new PhotosNetworkManager(SdkManagerMock);
    devicePhotosSyncChecker = new DevicePhotosSyncCheckerService(db);
    subject = new PhotosSyncManager(photosNetworkManager, devicePhotosSyncChecker);
  });
  describe('Handle status changes', () => {
    it('Should on pause stop processing operations', (done) => {
      const onStatusChangeMock = jest.fn<void, [PhotosSyncManagerStatus]>((status) => {
        expect(onStatusChangeMock).toHaveBeenNthCalledWith(1, PhotosSyncManagerStatus.PAUSED);
        done();
      });
      subject.onStatusChange(onStatusChangeMock);
      subject.run();
      subject.pause();
    });
  });

  describe('Process a sync operation', () => {
    it('Should resolve a photo found locally without checking remotely', (done) => {
      const devicePhotoFixture = createDevicePhotoFixture({ filename: 'photo_2.png' });
      const photoFixture = createPhotoFixture({ name: 'photo_2', type: 'png' });

      subject.getRemotePhotos = jest.fn();

      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [devicePhotoFixture],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 1,
        };
      });

      db.getSyncedPhotoByName = jest.fn(async () => {
        return {
          photo: photoFixture,
          photo_id: photoFixture.id,
          photo_name: photoFixture.name,
          photo_hash: photoFixture.hash,
        };
      });

      photosNetworkManager.processUploadOperation = jest.fn();

      subject.onStatusChange(() => {
        expect(photosNetworkManager.processUploadOperation).toHaveBeenCalledTimes(0);
        done();
      });
      subject.run();
    });

    it('Should resolve a photo found locally and check the others remotely', (done) => {
      const devicePhoto1Fixture = createDevicePhotoFixture({ filename: 'fixture1.png' });
      const photo1Fixture = createPhotoFixture({ name: 'fixture1' });
      const devicePhoto2Fixture = createDevicePhotoFixture({ filename: 'fixture2.png' });
      const photo2Fixture = createPhotoFixture({ name: 'fixture2' });
      const devicePhoto3Fixture = createDevicePhotoFixture({ id: 'fixture3', filename: 'photo_not_synced.png' });
      const photoNotSyncedFixture = createPhotoFixture({ name: 'photo_not_synced' });

      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [devicePhoto1Fixture, devicePhoto2Fixture, devicePhoto3Fixture],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 3,
        };
      });

      photosNetworkManager.processUploadOperation = jest.fn(async () => {
        return photoNotSyncedFixture;
      });

      db.getSyncedPhotoByName = jest
        .fn()
        .mockImplementationOnce(() => {
          return {
            photo: photo1Fixture,
            photo_name: photo1Fixture.name,
            photo_id: photo1Fixture.id,
          };
        })
        .mockImplementationOnce(() => {
          return {
            photo: photo2Fixture,
            photo_name: photo2Fixture.name,
            photo_id: photo2Fixture.id,
          };
        })
        .mockImplementationOnce(() => null);
      mockedGetAssetsAsync.mockImplementation(async () => {
        return {
          assets: [devicePhoto1Fixture, devicePhoto2Fixture, devicePhoto3Fixture],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      const onPhotoSyncCompletedMock = jest.fn();
      subject.onPhotoSyncCompleted(onPhotoSyncCompletedMock);

      subject.onStatusChange((status) => {
        if (status === PhotosSyncManagerStatus.COMPLETED) {
          expect(photosNetworkManager.processUploadOperation).toBeCalledTimes(1);
          done();
        }
      });
      subject.run();
    });
  });
});
