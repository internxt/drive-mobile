import { Photo } from '@internxt/sdk/dist/photos';
import * as photosUseCases from '@internxt-mobile/useCases/photos';
import { PhotosItemBacked } from '@internxt-mobile/types/photos';
import { photosUtils } from '../utils';
import { photosPreview } from './photosPreview.service';
import { photosNetwork } from '../network/photosNetwork.service';
import { SdkManager, logger } from '@internxt-mobile/services/common';
import fileSystemService from '@internxt-mobile/services/FileSystemService';

/**
 * A service that fixes the preview of a synced photo in case the aspect ratio
 * is not matching the original photo aspect ratio
 */
export class PhotosPreviewFixerService {
  static instance = new PhotosPreviewFixerService(SdkManager.getInstance());

  constructor(private sdk: SdkManager) {}

  /**
   * Given a synced photo, checks if it needs a preview fixing.
   *
   * @param syncedPhotosItem Photo to check if it needs fixing
   * @returns {boolean} True if the photo needs fixing, false otherwise
   */
  public needsFixing(syncedPhotosItem: Photo): boolean {
    const preview = syncedPhotosItem.previews?.[0];

    if (!preview) return false;

    const previewNeedsFixing = syncedPhotosItem.width !== syncedPhotosItem.height && preview.width === preview.height;
    return previewNeedsFixing;
  }

  /**
   * Given a synced photo, fixes the preview of the photo by checking the original photo aspect ratio
   * @throws {Error} If the synced photo does not need fixing or the synced photo is not found.
   * @param syncedPhotosItem  Synced photo to fix
   * @returns The fixed photo
   */
  public async fix(syncedPhotosItem: Photo): Promise<Photo> {
    const preview = syncedPhotosItem.previews?.[0];

    if (!preview) throw new Error('Unable to find preview, nothing to fix here');
    const photosItemBacked: PhotosItemBacked = {
      ...photosUtils.getPhotosItem(syncedPhotosItem),
      photoId: syncedPhotosItem.id,
      photoFileId: syncedPhotosItem.fileId,
      previewFileId: preview.fileId,
    };

    // 1. Download the full size photo
    const destination = await photosUseCases.downloadFullSizePhotosItem({
      photosItem: {
        ...photosItemBacked,
        bucketId: syncedPhotosItem.networkBucketId || photosItemBacked.bucketId,
      },
      onProgressUpdate: () => undefined,
    });

    if (!destination) throw new Error('Unable to download full size photo, cannot fix preview');

    logger.info(`Full size photo downloaded to ${destination}, exists: ${await fileSystemService.exists(destination)}`);
    // 2. Generate the fixed preview from the full size photo
    const fixedPreview = await photosPreview.generate({
      ...photosItemBacked,
      localUri: destination,
    });

    logger.info(`Fixed preview generated to ${fixedPreview.path}`);

    const fixedPreviewFileId = await photosNetwork.uploadPreview(fixedPreview.path);

    logger.info(`Fixed preview uploaded to ${fixedPreviewFileId}`);

    // 3. Update the photo with the fixed preview
    await this.sdk.photos.photos.updatePhoto(syncedPhotosItem.id, {
      previews: [
        {
          width: fixedPreview.width,
          height: fixedPreview.height,
          size: fixedPreview.size,
          fileId: fixedPreviewFileId,
          type: fixedPreview.type,
        },
      ],
    });

    logger.info('Fixed preview uploaded to the photo');

    // 4. Get the updated photo with the fixed preview
    const fixedPhoto = await this.sdk.photos.photos.getPhotoById(syncedPhotosItem.id);

    const fixedUploadedPreview = fixedPhoto.previews?.[0];

    if (!fixedUploadedPreview) throw new Error('Unable to find fixed preview in the uploaded photo');
    const previewIsFixed =
      syncedPhotosItem.width !== syncedPhotosItem.height && fixedPhoto.width !== fixedPreview.height;

    if (!previewIsFixed) throw new Error('Preview is not fixed in the uploaded photo, something went wrong');

    return fixedPhoto;
  }
}
