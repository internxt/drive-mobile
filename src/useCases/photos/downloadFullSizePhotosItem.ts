import errorService from '@internxt-mobile/services/ErrorService';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import photos from '@internxt-mobile/services/photos';
import { PhotosItemBacked, PhotoSizeType } from '@internxt-mobile/types/photos';
import strings from 'assets/lang/strings';

export const downloadFullSizePhotosItem = async ({
  photosItem,
  onProgressUpdate,
}: {
  photosItem: PhotosItemBacked;
  onProgressUpdate: (progress: number) => void;
}) => {
  try {
    if (!photosItem.photoFileId) return;
    const destination = photos.utils.getPhotoPath({
      name: photosItem.name,
      size: PhotoSizeType.Full,
      type: photosItem.format,
      takenAt: photosItem.takenAt,
    });
    if (await fileSystemService.fileExistsAndIsNotEmpty(destination)) {
      return destination;
    }
    return photos.network.download(photosItem.photoFileId as string, {
      destination,
      bucketId: photosItem.bucketId || undefined,
      decryptionProgressCallback: () => undefined,
      downloadProgressCallback: onProgressUpdate,
    });
  } catch (error) {
    errorService.reportError(error);
    notifications.error(strings.errors.generic.title);
  }
};
