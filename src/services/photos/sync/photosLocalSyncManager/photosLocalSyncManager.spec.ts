import { PhotosLocalSyncManager } from './photosLocalSyncManager';
import { PhotosSyncManagerStatus } from '../../../../types/photos';
import { getAssetsAsync } from 'expo-media-library';
import { PhotosNetworkManager } from '../../network/PhotosNetworkManager';
import { createDevicePhotoFixture, createPhotoFixture } from '__tests__/unit/fixtures/photos.fixture';
import { DevicePhotosSyncCheckerService } from '../devicePhotosSyncChecker';
import { PhotosRealmDB } from '../../database/photosRealmDB';
import { DevicePhotosScannerService } from '../devicePhotosScanner';

jest.mock('expo-media-library');
const mockedRealmDb = {
  _realm: {},

  init: jest.fn(),
  clear: jest.fn(),
  realm: {},
  saveDevicePhotos: jest.fn(),
  savePhotosItem: jest.fn(),
  getSyncedPhotoByNameAndDate: jest.fn(),
  getSyncedPhotosCount: jest.fn(),
  getSyncedPhotoByName: jest.fn(),
  getSyncedPhotoByHash: jest.fn(),
  deleteSyncedPhotosItem: jest.fn(),
  getSyncedPhotos: jest.fn(),
  parseObject: jest.fn(),
  parseFirst: jest.fn(),
} as unknown as PhotosRealmDB;
jest.mock('realm', () => mockedRealmDb);
const mockedGetAssetsAsync = jest.mocked(getAssetsAsync);

describe('PhotosSyncManager', () => {
  let photosNetworkManager: PhotosNetworkManager;
  let devicePhotosSyncChecker: DevicePhotosSyncCheckerService;
  let devicePhotosScanner: DevicePhotosScannerService;
  let subject: PhotosLocalSyncManager;
  beforeEach(() => {
    photosNetworkManager = new PhotosNetworkManager();
    devicePhotosSyncChecker = new DevicePhotosSyncCheckerService(mockedRealmDb);
    devicePhotosScanner = new DevicePhotosScannerService();
    subject = new PhotosLocalSyncManager(
      photosNetworkManager,
      devicePhotosSyncChecker,
      { enableLog: false },
      devicePhotosScanner,
      mockedRealmDb,
    );
  });
  describe('Handle status changes', () => {
    it('Should on pause stop processing operations', (done) => {
      const onStatusChangeMock = jest.fn<void, [PhotosSyncManagerStatus]>((status) => {
        expect(onStatusChangeMock).toHaveBeenNthCalledWith(1, PhotosSyncManagerStatus.RUNNING);
        expect(onStatusChangeMock).toHaveBeenNthCalledWith(2, PhotosSyncManagerStatus.PAUSED);
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

      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [devicePhotoFixture],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 1,
        };
      });

      mockedRealmDb.getSyncedPhotoByNameAndDate = jest.fn(async () => {
        return photoFixture;
      });

      photosNetworkManager.processUploadOperation = jest.fn();

      subject.onStatusChange(() => {
        expect(photosNetworkManager.processUploadOperation).toHaveBeenCalledTimes(0);
        done();
      });
      subject.run();
    });

    it('Should resolve a photo found locally and check the others remotely', (done) => {
      const takenAt = new Date('01/01/2010');

      const devicePhoto1Fixture = createDevicePhotoFixture({
        filename: 'fixture1.png',
        creationTime: takenAt.getTime(),
      });
      const photo1Fixture = createPhotoFixture({ name: 'fixture1', takenAt });
      const devicePhoto2Fixture = createDevicePhotoFixture({
        filename: 'fixture2.png',
        creationTime: takenAt.getTime(),
      });
      const photo2Fixture = createPhotoFixture({ name: 'fixture2', takenAt });
      const devicePhoto3Fixture = createDevicePhotoFixture({
        id: 'fixture3',
        filename: 'photo_not_synced.png',
        creationTime: takenAt.getTime(),
      });
      const photoNotSyncedFixture = createPhotoFixture({ name: 'photo_not_synced', takenAt });

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

      mockedRealmDb.getSyncedPhotoByNameAndDate = jest
        .fn()
        .mockImplementationOnce(() => {
          return photo1Fixture;
        })
        .mockImplementationOnce(() => {
          return photo2Fixture;
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
          expect(photosNetworkManager.processUploadOperation).toBeCalledTimes(2);
          done();
        }
      });
      subject.run();
    });
  });
});
