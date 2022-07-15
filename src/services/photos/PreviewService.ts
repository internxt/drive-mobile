import { ResizeFormat } from 'react-native-image-resizer';

import imageService from '../ImageService';
import { Photo } from '@internxt/sdk/dist/photos';

import fileSystemService from '../FileSystemService';

import { DevicePhoto, PhotoFileSystemRef, PhotoSizeType } from '../../types/photos';

import { PhotosCommonServices } from './PhotosCommonService';

export default class PhotosPreviewService {
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
      quality: 100,
      rotation: 0,
      options: { mode: 'cover' },
    });

    const destination = PhotosCommonServices.getPhotoPath({
      name: photo.filename,
      size: PhotoSizeType.Preview,
      type: resizerFormat,
    });
    if (!(await fileSystemService.exists(destination))) {
      await fileSystemService.copyFile(response.path, destination);
    }

    return { ...response, uri: response.uri, format: resizerFormat, type: resizerFormat, path: destination };
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
      const localPreviewPath = PhotosCommonServices.getPhotoPath({
        name: photo.name,
        size: PhotoSizeType.Preview,
        type: photo.type,
      });

      const exists = await fileSystemService.exists(localPreviewPath);

      return exists ? localPreviewPath : null;
    } catch (e) {
      return null;
    }
  }
}
