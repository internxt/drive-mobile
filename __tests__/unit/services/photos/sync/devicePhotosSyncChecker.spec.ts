import { DevicePhotosSyncCheckerService } from '../../../../../src/services/photos/sync/DevicePhotosSyncChecker';
import {
  DevicePhotosSyncCheckerStatus,
  DevicePhotoSyncCheckOperation,
  SyncStage,
} from '../../../../../src/types/photos';
import { createDevicePhotoFixture } from '../../../fixtures/photos.fixture';

describe('DevicePhotosSyncChecker system', () => {
  let subject: DevicePhotosSyncCheckerService;
  const db = {
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

  describe('Resolve an operation with a sync stage', () => {
    beforeEach(() => (subject = new DevicePhotosSyncCheckerService(db)));
    it('Should remove the operation from the sync queue', (done) => {
      const devicePhoto = createDevicePhotoFixture();
      const operationCallback = jest.fn(() => {
        expect(subject.pendingOperations).toBe(0);
        done();
      });
      subject.addOperation({
        id: 'operation-1',
        devicePhoto,
        onOperationCompleted: operationCallback,
      });
      expect(subject.pendingOperations).toBe(1);
    });

    it('Should mark the operation with NEEDS_REMOTE_CHECK SyncStage if not found locally', (done) => {
      const devicePhoto = createDevicePhotoFixture();
      const operation1Callback = jest.fn<void, [Error | null, DevicePhotoSyncCheckOperation | null]>(
        (err, resolvedOperation) => {
          expect(resolvedOperation).toMatchObject({ syncStage: SyncStage.NEEDS_REMOTE_CHECK });
          done();
        },
      );
      subject.addOperation({
        id: 'operation-1',
        devicePhoto,
        onOperationCompleted: operation1Callback,
      });
    });

    it('Should mark the operation with IN_SYNC stage if found locally', (done) => {
      const devicePhoto = createDevicePhotoFixture();
      db.getByDevicePhoto = jest.fn(async () => ({ photo_id: 'x', photo_ref: 'root/x', stage: SyncStage.IN_SYNC }));
      subject = new DevicePhotosSyncCheckerService(db);

      const operationCallback = jest.fn((err, resolvedOperation) => {
        expect(resolvedOperation).toMatchObject({ syncStage: SyncStage.IN_SYNC });
        done();
      });
      subject.addOperation({
        id: 'operation-1',
        devicePhoto,
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
          expect(statusChangeMock).toHaveBeenNthCalledWith(2, DevicePhotosSyncCheckerStatus.EMPTY);
          expect(statusChangeMock).toHaveBeenNthCalledWith(3, DevicePhotosSyncCheckerStatus.COMPLETED);
          expect(statusChangeMock).toBeCalledTimes(3);
          done();
        }
      });

      subject.onStatusChange(statusChangeMock);

      subject.addOperation({
        id: 'operation-1',
        devicePhoto: createDevicePhotoFixture(),
        onOperationCompleted: jest.fn(),
      });
    });
  });
});
