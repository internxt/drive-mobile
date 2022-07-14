import { Photo } from '@internxt/sdk/dist/photos';
import { PhotosSyncManager } from '../../../../../src/services/photos/sync/PhotosSyncManager';
import { PhotosSyncManagerStatus, SyncStage } from '../../../../../src/types/photos';
import { getAssetsAsync } from 'expo-media-library';
import { createDevicePhotoFixture, createPhotoFixture } from '../../../fixtures/photos.fixture';
import { PhotosNetworkManager } from '../../../../../src/services/photos/network/PhotosNetworkManager';
import { PhotosCommonServices } from '../../../../../src/services/photos/PhotosCommonService';

jest.mock('expo-media-library');

const mockedGetAssetsAsync = jest.mocked(getAssetsAsync, true);

describe('Photos Sync Manager', () => {
  const initialDbMock = {
    initialize: jest.fn(),
    persistPhotoSync: jest.fn(),
    getByPhotoRef: jest.fn(),
    clear: jest.fn(),
    getByPhotoId: jest.fn(),
    getByDevicePhoto: jest.fn(),
    getByPhoto: jest.fn(),
    getByPreviewUri: jest.fn(),
    getAll: jest.fn(),
    isInitialized: true,
  };
  const db = initialDbMock;

  let photosNetworkManager: PhotosNetworkManager;
  let subject: PhotosSyncManager;

  describe('Handle status changes', () => {
    beforeEach(() => {
      Object.keys(db).forEach((key) => {
        (db as any)[key] = jest.fn();
      });
      db.initialize();
      photosNetworkManager = new PhotosNetworkManager();
      subject = new PhotosSyncManager({ checkIfExistsPhotosAmount: 1 }, db, photosNetworkManager);
    });
    it('Should on pause stop processing operations', (done) => {
      const onStatusChangeMock = jest.fn<void, [PhotosSyncManagerStatus]>((status) => {
        if (status === PhotosSyncManagerStatus.PAUSED) {
          expect(onStatusChangeMock).toHaveBeenNthCalledWith(1, PhotosSyncManagerStatus.RUNNING);
          expect(onStatusChangeMock).toHaveBeenNthCalledWith(2, PhotosSyncManagerStatus.PAUSED);
          done();
        }
      });
      subject.onStatusChange(onStatusChangeMock);
      subject.run();
      subject.pause();
    });
  });

  describe('Process a sync operation', () => {
    beforeEach(() => {
      Object.keys(db).forEach((key) => {
        (db as any)[key] = jest.fn();
      });
      db.initialize();
      PhotosCommonServices.initialize('xxx');

      PhotosCommonServices.model = {
        ...PhotosCommonServices.model,
        networkCredentials: {
          encryptionKey: 'x123',
          user: 'user_xxx',
          password: 'xxx',
        },
        user: {
          id: 'xxx',
          updatedAt: new Date(),
          uuid: 'x123',
          bucketId: 'bucket123',
          createdAt: new Date(),
        },
        device: {
          id: 'xxx',
          mac: 'mac_xxx',
          name: 'name_x',
          userId: 'user_xxx',
          newestDate: new Date(),
          oldestDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      photosNetworkManager = new PhotosNetworkManager();
      subject = new PhotosSyncManager({ checkIfExistsPhotosAmount: 1 }, db, photosNetworkManager);
    });
    it('Should resolve a photo found locally without checking remotely', (done) => {
      jest.setTimeout(10000);
      const devicePhotoFixture = createDevicePhotoFixture();

      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [devicePhotoFixture],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      db.getByDevicePhoto = jest.fn(async () => {
        return {
          photo_ref: 'ref_xxx',
          stage: SyncStage.IN_SYNC,
        };
      });

      photosNetworkManager.getMissingRemotely = jest.fn();

      const onPhotoSyncCompletedMock = jest.fn<void, [Error | null, Photo | null]>(() => {
        expect(photosNetworkManager.getMissingRemotely).toHaveBeenCalledTimes(0);
        done();
      });
      subject.onPhotoSyncCompleted(onPhotoSyncCompletedMock);

      subject.run();
    });

    it('Should resolve a photo found locally', (done) => {
      const devicePhotoFixture = createDevicePhotoFixture();
      const photoFixture = createPhotoFixture();
      photosNetworkManager.getMissingRemotely = jest.fn(async () => {
        return [
          {
            devicePhoto: devicePhotoFixture,
            hash: 'xxx',
            photoRef: 'xxx',
            exists: true,
            photo: photoFixture,
          },
        ];
      });
      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [devicePhotoFixture],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      const onPhotoSyncCompletedMock = jest.fn<void, [Error | null, Photo | null]>((err, photo) => {
        expect(photo).toMatchObject(photoFixture);
        expect(err).toBe(null);
        done();
      });

      subject.onPhotoSyncCompleted(onPhotoSyncCompletedMock);

      subject.run();
    });

    it('Should resolve a photo found locally and check the others remotely', (done) => {
      photosNetworkManager = new PhotosNetworkManager();
      subject = new PhotosSyncManager({ checkIfExistsPhotosAmount: 2 }, db, photosNetworkManager);

      const devicePhoto1Fixture = createDevicePhotoFixture({ id: 'fixture1' });
      const devicePhoto2Fixture = createDevicePhotoFixture({ id: 'fixture2' });
      const devicePhoto3Fixture = createDevicePhotoFixture({ id: 'fixture3' });
      const photoFixture = createPhotoFixture();
      photosNetworkManager.getMissingRemotely = jest.fn(async () => {
        return [
          {
            devicePhoto: devicePhoto1Fixture,
            hash: 'xxx1',
            photoRef: 'xxx1',
            exists: true,
            photo: photoFixture,
          },
          {
            devicePhoto: devicePhoto2Fixture,
            hash: 'xxx2',
            photoRef: 'xxx2',
            exists: false,
            photo: undefined,
          },
          {
            devicePhoto: devicePhoto3Fixture,
            hash: 'xxx3',
            photoRef: 'xxx3',
            exists: false,
            photo: undefined,
          },
        ];
      });

      photosNetworkManager.processUploadOperation = jest.fn(async () => {
        return createPhotoFixture();
      });
      db.persistPhotoSync = jest.fn(async () => {
        return;
      });
      db.getByDevicePhoto = jest
        .fn()
        .mockImplementationOnce(async () => {
          return {
            photo_ref: 'xxx1',
            stage: SyncStage.IN_SYNC,
          };
        })
        .mockImplementationOnce(() => null)
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
        if (status === PhotosSyncManagerStatus.EMPTY) {
          expect(photosNetworkManager.processUploadOperation).toBeCalledTimes(2);
          done();
        }
      });
      subject.run();
    });
  });
});
