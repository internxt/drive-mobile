import { ResizeFormat } from 'react-native-image-resizer';
import Axios from 'axios';

import { PhotosServiceModel } from '../../types/photos';
import imageService from '../ImageService';
import { Photo, Photos } from '@internxt/sdk/dist/photos';
import { items } from '@internxt/lib';
import PhotosDownloadService from './PhotosDownloadService';
import fileSystemService from '../FileSystemService';
import network from '../../network';
import { constants } from '../AppService';
import { PHOTOS_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_TMP_DIRECTORY } from './constants';

export default class PhotosPreviewService {
  public static readonly PREVIEW_EXTENSION: ResizeFormat = 'JPEG';
  private static readonly PREVIEW_WIDTH = 512;
  private static readonly PREVIEW_HEIGHT = 512;
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;
  private readonly downloadService: PhotosDownloadService;
  constructor(model: PhotosServiceModel, photosSdk: Photos, downloadService: PhotosDownloadService) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.downloadService = downloadService;
  }

  public async update(photo: Photo): Promise<void> {
    const fullName = items.getItemDisplayName({ name: photo.name, type: photo.type });
    const fullSizePath = `${PHOTOS_DIRECTORY}/${fullName}`;
    const isFullSizeAlreadyDownloaded = await fileSystemService.exists(fullSizePath);

    if (!isFullSizeAlreadyDownloaded) {
      await this.downloadService.pullPhoto(photo.fileId, {
        toPath: fullSizePath,
        downloadProgressCallback: () => undefined,
        decryptionProgressCallback: () => undefined,
      });
    }

    const previewInfo = await this.generate(fileSystemService.pathToUri(fullSizePath), photo.id);
    const fileId = await network.uploadFile(
      fullSizePath,
      this.model.user?.bucketId || '',
      this.model.networkCredentials.encryptionKey,
      constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
      {
        user: this.model.networkCredentials.user,
        pass: this.model.networkCredentials.password,
      },
      {},
    );
    const previews = [
      {
        fileId,
        width: previewInfo.width,
        height: previewInfo.height,
        size: previewInfo.size,
        type: previewInfo.format,
      },
    ];

    await Axios.patch(
      `${this.photosSdk.baseUrl}/photos/${photo.id}`,
      { previews },
      {
        headers: {
          Authorization: `Bearer ${this.photosSdk.accessToken}`,
        },
      },
    );
  }

  /**
   *
   * @param fullSizeUri Uri pointing to the source file i.e the original photo
   * @param filename Name of the preview file
   * @returns
   */
  public async generate(
    fullSizeUri: string,
    previewDestination: string,
  ): Promise<{ width: number; height: number; path: string; size: number; format: string }> {
    const path = previewDestination;
    const width = PhotosPreviewService.PREVIEW_WIDTH;
    const height = PhotosPreviewService.PREVIEW_HEIGHT;
    const response = await imageService.resize({
      uri: fullSizeUri,
      width,
      height,
      format: PhotosPreviewService.PREVIEW_EXTENSION,
      quality: 100,
      rotation: 0,
      options: { mode: 'cover' },
    });

    await fileSystemService.copyFile(response.path, path);

    return { ...response, path, format: PhotosPreviewService.PREVIEW_EXTENSION };
  }

  /**
   * Gets a preview for a given photo, either cached or raw (from the server), if the
   * preview is pulled from the server, it will be cached in the local file system
   *
   * @param photoId The photo id we will retrieve the preview for
   * @returns a base64 string containing the preview, either from the cached dir, or pulled from the server
   */
  public async getPreview(photo: Photo): Promise<string | null> {
    const BASE_64_PREFIX = 'data:image/jpeg;base64,';
    const localPreviewPath = `${PHOTOS_PREVIEWS_DIRECTORY}/${photo.previewId}`;

    // Check if preview exists in the file system
    const previewExistsLocally = await fileSystemService.exists(localPreviewPath);
    console.log('PREVIEW IN DEVICE', previewExistsLocally);
    // If the preview doesn't exists
    // locally download and store it in the file system
    if (!previewExistsLocally) {
      await this.downloadService.pullPhoto(photo.previewId, {
        toPath: localPreviewPath,
        decryptionProgressCallback: () => {
          return undefined;
        },
        downloadProgressCallback: () => {
          return undefined;
        },
      });

      //await this.generate(destination, localPreviewPath);
    }

    const result = await fileSystemService.readFile(localPreviewPath);

    return `${BASE_64_PREFIX}${result.toString('base64')}`;
  }
}
