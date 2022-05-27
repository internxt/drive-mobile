import { ResizeFormat } from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import Axios from 'axios';

import { PhotosServiceModel } from '../../types/photos';
import imageService from '../ImageService';
import { Photo, Photos } from '@internxt/sdk/dist/photos';
import PhotosFileSystemService from './PhotosFileSystemService';
import { items } from '@internxt/lib';
import PhotosDownloadService from './PhotosDownloadService';
import fileSystemService from '../FileSystemService';
import network from '../../network';
import { constants } from '../AppService';

export default class PhotosPreviewService {
  public static readonly PREVIEW_EXTENSION: ResizeFormat = 'JPEG';
  private static readonly PREVIEW_WIDTH = 512;
  private static readonly PREVIEW_HEIGHT = 512;
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;
  private readonly fileSystemService: PhotosFileSystemService;
  private readonly downloadService: PhotosDownloadService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: Photos,
    fileSystemService: PhotosFileSystemService,
    downloadService: PhotosDownloadService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.fileSystemService = fileSystemService;
    this.downloadService = downloadService;
  }

  public async update(photo: Photo): Promise<void> {
    const fullName = items.getItemDisplayName({ name: photo.name, type: photo.type });
    const fullSizePath = `${this.fileSystemService.photosDirectory}/${fullName}`;
    const isFullSizeAlreadyDownloaded = await RNFS.exists(fullSizePath);

    if (!isFullSizeAlreadyDownloaded) {
      await this.downloadService.pullPhoto(photo.fileId, {
        toPath: fullSizePath,
        downloadProgressCallback: () => undefined,
        decryptionProgressCallback: () => undefined,
      });
    }

    const previewInfo = await this.generate(
      fileSystemService.pathToUri(fullSizePath),
      this.fileSystemService.previewsDirectory,
      photo.id,
    );
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

  public async generate(
    fullSizeUri: string,
    outputDirectory: string,
    filename: string,
  ): Promise<{ width: number; height: number; path: string; size: number; format: string }> {
    const path = `${outputDirectory}/${filename}.${PhotosPreviewService.PREVIEW_EXTENSION}`;
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

    await RNFS.copyFile(response.path, path);

    return { ...response, path, format: PhotosPreviewService.PREVIEW_EXTENSION };
  }
}
