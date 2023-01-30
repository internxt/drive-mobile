import { createPhotoFixture, createPhotosItemFixture } from '__tests__/unit/fixtures/photos.fixture';
import { DevicePhotosSyncCheckerService } from '../../../../../src/services/photos/sync/devicePhotosSyncChecker/devicePhotosSyncChecker';
import {
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  SyncStage,
} from '../../../../../src/types/photos';
import { PhotosRealmDB } from '../../database';

const mockedRealmDb = {
  _realm: null,

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
describe('DevicePhotosSyncChecker', () => {
  let subject: DevicePhotosSyncCheckerService;

  describe('Resolve an operation with a sync stage', () => {
    beforeEach(() => (subject = new DevicePhotosSyncCheckerService(mockedRealmDb)));
    it('Should remove the operation from the sync queue', (done) => {
      const operationCallback = jest.fn(() => {
        expect(subject.totalOperations).toBe(0);
        expect(subject.totalPhotosChecked).toBe(1);
        done();
      });
      subject.addOperation({
        photosItem: createPhotosItemFixture(),
        onOperationCompleted: operationCallback,
      });
    });

    it('Should mark the operation with NEEDS_REMOTE_CHECK SyncStage if not found locally', (done) => {
      mockedRealmDb.getSyncedPhotoByNameAndDate = jest.fn(async () => null);
      const operation1Callback = jest.fn<void, [Error | null, DevicePhotoSyncCheckOperation | null]>(
        (err, resolvedOperation) => {
          expect(resolvedOperation).toMatchObject({ syncStage: SyncStage.NEEDS_REMOTE_CHECK });
          done();
        },
      );
      subject.addOperation({
        photosItem: createPhotosItemFixture(),
        onOperationCompleted: operation1Callback,
      });
    });

    it('Should mark the operation with IN_SYNC stage if found locally', (done) => {
      mockedRealmDb.getSyncedPhotoByNameAndDate = jest.fn(async () => createPhotoFixture());
      subject = new DevicePhotosSyncCheckerService(mockedRealmDb);

      const operationCallback = jest.fn((err, resolvedOperation) => {
        expect(resolvedOperation).toMatchObject({ syncStage: SyncStage.IN_SYNC });
        done();
      });
      subject.addOperation({
        photosItem: createPhotosItemFixture(),
        onOperationCompleted: operationCallback,
      });
    });
  });

  describe('Notify the sync checker queue status correctly', () => {
    beforeEach(() => (subject = new DevicePhotosSyncCheckerService(mockedRealmDb)));
    it('Should end with status sequence RUNNING > EMPTY > COMPLETED', (done) => {
      const statusChangeMock = jest.fn<void, [DevicePhotosSyncCheckerStatus]>((status) => {
        if (status === DevicePhotosSyncCheckerStatus.COMPLETED) {
          expect(statusChangeMock).toHaveBeenNthCalledWith(1, DevicePhotosSyncCheckerStatus.RUNNING);
          expect(statusChangeMock).toHaveBeenNthCalledWith(2, DevicePhotosSyncCheckerStatus.COMPLETED);
          expect(statusChangeMock).toBeCalledTimes(2);
          done();
        }
      });

      subject.onStatusChange(statusChangeMock);
      subject.run();
      subject.addOperation({
        photosItem: createPhotosItemFixture(),
        onOperationCompleted: jest.fn(),
      });
    });
  });
});
