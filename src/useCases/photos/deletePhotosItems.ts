import strings from 'assets/lang/strings';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import photos from '@internxt-mobile/services/photos';
import { PhotosItemBacked } from '@internxt-mobile/types/photos';
import errorService from '@internxt-mobile/services/ErrorService';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';

export const deletePhotosItems = async ({ photosToDelete }: { photosToDelete: PhotosItemBacked[] }) => {
  try {
    if (photosToDelete.some((p) => !p || !p.photoId)) {
      throw new Error('Some photos item id is missing');
    }

    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashConfirmed, {
      individual_action: true,
      number_of_items: photosToDelete.length,
    });
    await photos.network.deletePhotos(photosToDelete);
    notificationsService.success(strings.messages.photo_deleted);
  } catch (error) {
    errorService.reportError(error);
  }
};
