import { ResizeFormat } from 'react-native-image-resizer';

import { Photo } from '@internxt/sdk/dist/photos';

import imageService from '@internxt-mobile/services/ImageService';
import { photosUtils } from '../utils';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { DevicePhoto, PhotoFileSystemRef, PhotoSizeType } from '@internxt-mobile/types/photos';
import { photosNetwork } from '../network/photosNetwork.service';

export class PhotosPreviewService {
  private static readonly PREVIEW_WIDTH = 512;
  private static readonly PREVIEW_HEIGHT = 512;

  public async generate(
    photo: DevicePhoto,
  ): Promise<{ width: number; height: number; path: string; size: number; format: string; uri: string; type: string }> {
    const [, extension] = photo.filename.split('.');

    const width = PhotosPreviewService.PREVIEW_WIDTH;
    const height = PhotosPreviewService.PREVIEW_HEIGHT;
    const resizerFormat = this.getResizerFormat(extension);

    const response = await imageService.resize({
      uri: photo.uri,
      width,
      height,
      format: resizerFormat,
      quality: 70,
      rotation: 0,
      options: { mode: 'cover' },
    });

    const destination = photosUtils.getPhotoPath({
      name: photosUtils.getPhotoName(photo.filename),
      size: PhotoSizeType.Preview,
      type: resizerFormat.toLowerCase(),
    });

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
  public async getLocalPreview(photo: Photo): Promise<PhotoFileSystemRef | null> {
    try {
      if (!photo.previews) throw new Error('Photo does not has a preview');
      const localPreviewPath = photosUtils.getPhotoPath({
        name: photo.name,
        size: PhotoSizeType.Preview,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // Should fix this in the SDK, types are wrong
        type: photo.previews[0].type,
      });

      const exists = await fileSystemService.exists(localPreviewPath);

      return exists ? localPreviewPath : null;
    } catch (e) {
      return null;
    }
  }

  public async getPreview(photo: Photo): Promise<PhotoFileSystemRef | null> {
    const localPreview = await this.getLocalPreview(photo);

    if (localPreview) {
      return fileSystemService.pathToUri(localPreview);
    }

    const photoRemotePreviewData = this.getPhotoRemotePreviewData(photo);

    if (photoRemotePreviewData) {
      const destinationPath = photosUtils.getPhotoPath({
        name: photo.name,
        size: PhotoSizeType.Preview,
        type: photo.type,
      });

      const photoPreviewRef = await photosNetwork.download(photoRemotePreviewData.fileId, {
        destination: destinationPath,
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
