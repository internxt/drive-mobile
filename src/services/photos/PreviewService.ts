import { ResizeFormat } from 'react-native-image-resizer';

import imageService from '../ImageService';
import { Photo } from '@internxt/sdk/dist/photos';

import fileSystemService from '../FileSystemService';

import { PHOTOS_PREVIEWS_DIRECTORY } from './constants';
import { DevicePhoto, PhotoFileSystemRef } from '../../types/photos';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';

export default class PhotosPreviewService {
  private static readonly PREVIEW_WIDTH = 512;
  private static readonly PREVIEW_HEIGHT = 512;

  private photosDb = new PhotosLocalDatabaseService();

  public async generate(
    photo: DevicePhoto,
  ): Promise<{ width: number; height: number; path: string; size: number; format: string }> {
    const [photoName, extension] = photo.filename.split('.');

    const width = PhotosPreviewService.PREVIEW_WIDTH;
    const height = PhotosPreviewService.PREVIEW_HEIGHT;
    const resizerFormat = this.getResizerFormat(extension);
    const path = `${PHOTOS_PREVIEWS_DIRECTORY}/${photoName}_preview.${resizerFormat}`;
    const response = await imageService.resize({
      uri: photo.uri,
      width,
      height,
      format: resizerFormat,
      quality: 100,
      rotation: 0,
      options: { mode: 'cover' },
      outputPath: path,
    });

    return { ...response, format: resizerFormat };
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
   * @param photoId The photo id we will retrieve the preview for
   * @returns a FileSystemRef pointing to the image file
   */
  public async getLocalPreview(photo: Photo): Promise<PhotoFileSystemRef | null> {
    //const BASE_64_PREFIX = 'data:image/jpeg;base64,';
    try {
      /*  const dbPreview = await this.photosDb.getByPhotoId(photo.id);

      if (dbPreview.photo_ref) {
        return dbPreview.photo_ref;
      } */
      const localPreviewPath = `${PHOTOS_PREVIEWS_DIRECTORY}/${photo.previewId}.${photo.type}`;

      const previewExistsLocally = await fileSystemService.statRNFS(localPreviewPath);

      if (!previewExistsLocally || !previewExistsLocally.size) throw new Error();
      else return localPreviewPath;
    } catch (e) {
      return null;
    }

    /* const result = await fileSystemService.readFile(localPreviewPath);

    return `${BASE_64_PREFIX}${result.toString('base64')}`; */
  }
}
