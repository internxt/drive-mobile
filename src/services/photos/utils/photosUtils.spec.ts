import { PhotosItem, PhotoSyncStatus } from '@internxt-mobile/types/photos';
import { createPhotosItemFixture } from '__tests__/unit/fixtures/photos.fixture';
import { PhotosUtils } from './photosUtils';

describe('Photos utils test', () => {
  const sut = new PhotosUtils();
  describe('mergePhotosItems', () => {
    it('Should mark a photo as in sync when is found remotely and locally', () => {
      const deviceOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });

      const syncOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_SYNC_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });
      const merged = sut.mergePhotosItems([deviceOnlyPhotosItem, syncOnlyPhotosItem]);
      expect(merged.length).toBe(1);
      expect(merged[0].status).toBe(PhotoSyncStatus.DEVICE_AND_IN_SYNC);
    });

    it('Should group photos by name only', () => {
      const deviceOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        name: 'photo_device_1',
      });

      const syncOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        name: 'photo_device_2',
      });
      const merged = sut.mergePhotosItems([deviceOnlyPhotosItem, syncOnlyPhotosItem]);
      expect(merged.length).toBe(2);
      expect(merged[0].status).toBe(PhotoSyncStatus.IN_DEVICE_ONLY);
    });

    it('Should exclude DELETED photos even if they exists locally and remotely', () => {
      const deviceOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        name: 'photo_device_1',
      });

      const syncOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.DELETED,
        name: 'photo_device_1',
      });
      const merged = sut.mergePhotosItems([deviceOnlyPhotosItem, syncOnlyPhotosItem]);
      expect(merged.length).toBe(0);
    });

    it('Should use the remote photo propertys if exists locally', () => {
      const deviceOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });

      const syncOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        photoId: 'photo_id_remote_1',
        photoFileId: 'photo_file_id_remote_1',
        status: PhotoSyncStatus.IN_SYNC_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });
      const merged = sut.mergePhotosItems([deviceOnlyPhotosItem, syncOnlyPhotosItem]);
      expect(merged.length).toBe(1);
      expect(merged[0].photoId).toBe('photo_id_remote_1');
      expect(merged[0].photoFileId).toBe('photo_file_id_remote_1');
      expect(merged[0].status).toBe(PhotoSyncStatus.DEVICE_AND_IN_SYNC);
    });

    it('Should merge the same photos in a single one if name and takenAt matches', () => {
      const deviceOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_DEVICE_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });

      const syncOnlyPhotosItem: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_SYNC_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });

      const syncOnlyPhotosItem2: PhotosItem = createPhotosItemFixture({
        status: PhotoSyncStatus.IN_SYNC_ONLY,
        name: 'photo_device_1',
        takenAt: 123,
      });
      const merged = sut.mergePhotosItems([deviceOnlyPhotosItem, syncOnlyPhotosItem, syncOnlyPhotosItem2]);
      expect(merged.length).toBe(1);
      expect(merged[0].name).toBe('photo_device_1');
    });
  });
});
