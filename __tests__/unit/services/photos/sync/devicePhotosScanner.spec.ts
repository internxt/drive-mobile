import { getAssetsAsync } from 'expo-media-library';
import {
  DevicePhotosScannerService,
  DevicePhotosScannerStatus,
} from '../../../../../src/services/photos/sync/DevicePhotosScannerService';
import { DevicePhoto } from '../../../../../src/types/photos';
import { createDevicePhotoFixture } from '../../../fixtures/photos.fixture';
import { arrayOfFixtures } from '../../../fixtures/utils';
jest.mock('expo-media-library');

const mockedGetAssetsAsync = jest.mocked(getAssetsAsync, true);

describe('Device Photos Scanner', () => {
  let subject = new DevicePhotosScannerService();

  describe('When no photos found in the camera roll', () => {
    beforeEach(() => {
      subject = new DevicePhotosScannerService();
    });
    it('Should call the group callback once with an empty array', () => {
      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      const callbackMock = jest.fn(() => {
        expect(callbackMock).toHaveBeenCalledWith([]);
      });

      subject.onGroupOfPhotosReady(callbackMock);

      subject.run();
    });

    it('Should finish with sequence RUNNING -> DONE -> IDLE', (done) => {
      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      const statusChangeMock = jest.fn<void, [DevicePhotosScannerStatus]>((status) => {
        if (status === DevicePhotosScannerStatus.IDLE) {
          expect(statusChangeMock).toHaveBeenNthCalledWith(1, DevicePhotosScannerStatus.RUNNING);
          expect(statusChangeMock).toHaveBeenNthCalledWith(2, DevicePhotosScannerStatus.DONE);
          expect(statusChangeMock).toHaveBeenNthCalledWith(3, DevicePhotosScannerStatus.IDLE);
          expect(statusChangeMock).toBeCalledTimes(3);

          done();
        }
      });

      subject.onStatusChange(statusChangeMock);

      subject.run();
    });
  });

  describe('When multiple photos are found in the camera roll', () => {
    it('Should provide multiple groups of photos if needed', (done) => {
      const group1 = arrayOfFixtures(createDevicePhotoFixture, 50);
      const group2 = arrayOfFixtures(createDevicePhotoFixture, 50);
      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: group1,
          endCursor: 'x',
          hasNextPage: true,
          totalCount: 0,
        };
      });
      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: group2,
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      const onGroupReadyMock = jest.fn<void, [DevicePhoto[]]>();

      const statusChangeMock = jest.fn<void, [DevicePhotosScannerStatus]>((status) => {
        if (status === DevicePhotosScannerStatus.IDLE) {
          expect(onGroupReadyMock).toHaveBeenCalledTimes(2);
          done();
        }
      });

      subject.onStatusChange(statusChangeMock);
      subject.onGroupOfPhotosReady(onGroupReadyMock);
      subject.run();
    });
  });
});
