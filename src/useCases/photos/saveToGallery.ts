import errorService from '@internxt-mobile/services/ErrorService';
import notificationsService from '@internxt-mobile/services/NotificationsService';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';
import { photosUtils } from '@internxt-mobile/services/photos/utils';
import { PhotosItem } from '@internxt-mobile/types/photos';
import strings from 'assets/lang/strings';
import { saveToLibraryAsync } from 'expo-media-library';
export const saveToGallery = async ({ photosItem }: { photosItem: PhotosItem }) => {
  try {
    photos.analytics.track(PhotosAnalyticsEventKey.DownloadPhotoSelected, {
      destination: 'gallery',
    });

    const uri = await photosUtils.cameraRollUriToFileSystemUri(
      {
        name: photosItem.name,
        type: photosItem.format,
      },
      photosItem.localUri || photosItem.localFullSizePath,
    );
    await saveToLibraryAsync(uri);

    photos.analytics.track(PhotosAnalyticsEventKey.PhotoDownloaded, {
      destination: 'gallery',
    });
    notificationsService.success(strings.messages.image_saved_to_gallery);
  } catch (error) {
    errorService.reportError(error);
    notificationsService.error(strings.errors.generic.title);
  }
};
