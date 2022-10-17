import { createPhotoFixture, createPhotosItemFixture } from '__tests__/unit/fixtures/photos.fixture';
import { DevicePhotosSyncCheckerService } from '../../../../../src/services/photos/sync/devicePhotosSyncChecker/devicePhotosSyncChecker';
import {
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  SyncStage,
} from '../../../../../src/types/photos';

describe('DevicePhotosSyncChecker', () => {
  let subject: DevicePhotosSyncCheckerService;
  const db = {
    init: jest.fn(),
    persistPhotoSync: jest.fn(),
    getByPhotoRef: jest.fn(),
    clear: jest.fn(),
    getByPhotoId: jest.fn(),
    getByDevicePhoto: jest.fn(),
    getByPhoto: jest.fn(),
    getByPreviewUri: jest.fn(),
    getAll: jest.fn(),
    isInitialized: true,
  } as any;

  describe('Resolve an operation with a sync stage', () => {
    beforeEach(() => (subject = new DevicePhotosSyncCheckerService(db)));
    it('Should remove the operation from the sync queue', (done) => {
      const operationCallback = jest.fn(() => {
        expect(subject.pendingOperations).toBe(0);
        done();
      });
      subject.addOperation({
        photosItem: createPhotosItemFixture(),
        onOperationCompleted: operationCallback,
      });
      expect(subject.pendingOperations).toBe(1);
    });

    it('Should mark the operation with NEEDS_REMOTE_CHECK SyncStage if not found locally', (done) => {
      db.getSyncedPhotoByName = jest.fn(async () => null);
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
      db.getSyncedPhotoByName = jest.fn(async () => ({ photo: createPhotoFixture() }));
      subject = new DevicePhotosSyncCheckerService(db);

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
    beforeEach(() => (subject = new DevicePhotosSyncCheckerService(db)));
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

      subject.addOperation({
        photosItem: createPhotosItemFixture(),
        onOperationCompleted: jest.fn(),
      });
    });
  });
});
