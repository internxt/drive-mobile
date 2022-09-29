import { ResizeFormat } from 'react-native-image-resizer';
import { Photo } from '@internxt/sdk/dist/photos';
import imageService from '@internxt-mobile/services/ImageService';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { PhotoFileSystemRef, PhotosItem } from '@internxt-mobile/types/photos';
import { photosNetwork } from '../network/photosNetwork.service';
import { photosUtils } from '../utils';

export class PhotosPreviewService {
  private static readonly PREVIEW_WIDTH = 512;
  private static readonly PREVIEW_HEIGHT = 512;

  public async generate(
    photosItem: PhotosItem,
  ): Promise<{ width: number; height: number; path: string; size: number; format: string; uri: string; type: string }> {
    const width = PhotosPreviewService.PREVIEW_WIDTH;
    const height = PhotosPreviewService.PREVIEW_HEIGHT;
    const resizerFormat = this.getResizerFormat(photosItem.format);
    if (!photosItem.localUri) throw new Error('Unable to find local uri for photo');
    const response = await imageService.resize({
      uri: photosItem.localUri,
      width,
      height,
      format: resizerFormat,
      quality: 70,
      rotation: 0,
      options: { mode: 'cover' },
    });

    const destination = await photosUtils.cameraRollUriToFileSystemUri(
      { name: photosItem.name, type: photosItem.format },
      photosItem.localPreviewPath,
    );

    if (!(await fileSystemService.exists(destination))) {
      await fileSystemService.moveFile(response.path, destination);
    }

    return {
      ...response,
      uri: response.uri,
      format: resizerFormat,
      type: resizerFormat,
      path: destination,
    };
  }

  private getResizerFormat(format: string) {
    const formats: Record<string, ResizeFormat> = {
      jpg: 'JPEG',
      png: 'PNG',
    };

    return formats[format] || formats['jpg'];
  }

  /**
   * Gets a local preview for a given photo
   *
   * @param photo The photo to get preview from
   * @returns a FileSystemRef pointing to the image file
   */
  public async getLocalPreview(photo: PhotosItem): Promise<PhotoFileSystemRef | null> {
    try {
      if (!photo.localPreviewPath) throw new Error('Photo does not has a preview');

      const exists = await fileSystemService.exists(photo.localPreviewPath);

      return exists ? photo.localPreviewPath : null;
    } catch (e) {
      return null;
    }
  }

  public async getPreview(photo: PhotosItem): Promise<PhotoFileSystemRef | null> {
    const localPreview = await this.getLocalPreview(photo);

    if (localPreview) {
      return fileSystemService.pathToUri(localPreview);
    }

    if (photo.previewFileId) {
      const photoPreviewRef = await photosNetwork.download(photo.previewFileId, {
        destination: photo.localPreviewPath,
        decryptionProgressCallback: () => undefined,
        downloadProgressCallback: () => undefined,
      });

      return fileSystemService.pathToUri(photoPreviewRef);
    }

    return null;
  }

  private getPhotoRemotePreviewData(photo: Photo) {
    const photoRemotePreview =
      photo.previewId && photo.previews
        ? photo.previews.find((preview) => preview.fileId === photo.previewId)
        : undefined;

    return photoRemotePreview;
  }
}

export const photosPreview = new PhotosPreviewService();
