import RNFS from 'react-native-fs';
import { Photo, Photos, CreatePhotoData } from '@internxt/sdk/dist/photos';
import { ResizeFormat } from 'react-native-image-resizer';

import * as network from '../network';
import imageService from '../image';
import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import PhotosFileSystemService from './PhotosFileSystemService';
import { pathToUri, uriToPath } from '../fileSystem';

export default class PhotosUploadService {
  private static readonly PREVIEW_EXTENSION: ResizeFormat = 'JPEG';
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;
  private readonly logService: PhotosLogService;
  private readonly fileSystemService: PhotosFileSystemService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: Photos,
    logService: PhotosLogService,
    fileSystemService: PhotosFileSystemService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.logService = logService;
    this.fileSystemService = fileSystemService;
  }

  public async upload(data: Omit<CreatePhotoData, 'fileId' | 'previewId'>, uri: string): Promise<[Photo, string]> {
    const tmpPreviewPath = await this.generatePreview(
      this.fileSystemService.tmpDirectory,
      `${data.name}-${new Date().getTime()}`,
      uri,
    );

    this.logService.info('Uploading preview for photo ' + data.name);
    const previewId = await network.uploadFile(
      tmpPreviewPath,
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    this.logService.info('Uploading photo for photo ' + data.name);
    const fileId = await network.uploadFile(
      uriToPath(uri),
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    const hash = await RNFS.hash(uri, 'sha256');
    const createPhotoData: CreatePhotoData = {
      takenAt: data.takenAt,
      deviceId: data.deviceId,
      height: data.height,
      name: data.name, // TODO: Encrypt name
      size: data.size,
      type: data.type,
      userId: data.userId,
      width: data.width,
      fileId,
      previewId,
      hash,
    };
    const createdPhoto = await this.photosSdk.photos.createPhoto(createPhotoData);
    const finalPreviewPath = `${this.fileSystemService.previewsDirectory}/${createdPhoto.id}.${PhotosUploadService.PREVIEW_EXTENSION}`;

    await RNFS.copyFile(tmpPreviewPath, finalPreviewPath);

    return [createdPhoto, pathToUri(finalPreviewPath)];
  }

  private async generatePreview(directory: string, name: string, uri: string): Promise<string> {
    const path = `${directory}/${name}.${PhotosUploadService.PREVIEW_EXTENSION}`;
    const width = 128;
    const height = 128;

    const response = await imageService.resize({
      uri,
      width,
      height,
      format: 'JPEG',
      outputPath: this.fileSystemService.previewsDirectory,
      quality: 100,
      rotation: 0,
      options: { mode: 'cover' },
    });

    await RNFS.copyFile(response.path, path);
    await RNFS.unlink(response.path);

    return path;
  }
}
