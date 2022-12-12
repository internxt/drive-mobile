import { getAssetsAsync } from 'expo-media-library';
import { DevicePhotosScannerService, DevicePhotosScannerStatus } from './devicePhotosScanner';
import { arrayOfFixtures } from '__tests__/unit/fixtures/utils';
import { createDevicePhotoFixture } from '__tests__/unit/fixtures/photos.fixture';
import { PHOTOS_PER_GROUP } from '../../constants';
import { PhotosItem } from '@internxt-mobile/types/photos';

jest.mock('expo-media-library');

const mockedGetAssetsAsync = jest.mocked(getAssetsAsync);

describe('DevicePhotosScanner', () => {
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

    it('Should finish with sequence RUNNING -> COMPLETED', (done) => {
      mockedGetAssetsAsync.mockImplementationOnce(async () => {
        return {
          assets: [],
          endCursor: 'x',
          hasNextPage: false,
          totalCount: 0,
        };
      });

      const statusChangeMock = jest.fn<void, [DevicePhotosScannerStatus]>((status) => {
        if (status === DevicePhotosScannerStatus.COMPLETED) {
          expect(statusChangeMock).toHaveBeenNthCalledWith(1, DevicePhotosScannerStatus.RUNNING);
          expect(statusChangeMock).toHaveBeenNthCalledWith(2, DevicePhotosScannerStatus.COMPLETED);

          expect(statusChangeMock).toBeCalledTimes(2);

          done();
        }
      });

      subject.onStatusChange(statusChangeMock);

      subject.run();
    });
  });

  describe('When multiple photos are found in the camera roll', () => {
    it('Should provide multiple groups of photos if needed', (done) => {
      const group1 = arrayOfFixtures(createDevicePhotoFixture, PHOTOS_PER_GROUP);
      const group2 = arrayOfFixtures(createDevicePhotoFixture, PHOTOS_PER_GROUP);
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

      const onGroupReadyMock = jest.fn((items: PhotosItem[]) => {
        expect(items.length).toBe(PHOTOS_PER_GROUP);
      });

      const statusChangeMock = jest.fn<void, [DevicePhotosScannerStatus]>((status) => {
        if (status === DevicePhotosScannerStatus.COMPLETED) {
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
