import RNFS from 'react-native-fs';
import { Photo, Photos, CreatePhotoData } from '@internxt/sdk/dist/photos';
import { Platform } from 'react-native';

import * as network from '../network';
import imageService from '../image';
import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import PhotosFileSystemService from './PhotosFileSystemService';
import { items } from '@internxt/lib';
import { pathToUri } from '../fileSystem';

export default class PhotosUploadService {
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
    const photoPath = await this.copyPhotoToDocumentsDir(data, data.width, data.height, uri);
    const previewPath = await this.generatePreview(data, uri);

    this.logService.info('PhotosUploadService.upload - photoPath: ' + photoPath);
    this.logService.info('PhotosUploadService.upload - previewPath: ' + previewPath);

    this.logService.info('Uploading preview for photo ' + data.name);
    const previewId = await network.uploadFile(
      previewPath,
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    this.logService.info('Uploading photo for photo ' + data.name);
    const fileId = await network.uploadFile(
      photoPath,
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    await RNFS.unlink(photoPath);

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
    };
    const createdPhoto = await this.photosSdk.photos.createPhoto(createPhotoData);

    return [createdPhoto, pathToUri(previewPath)];
  }

  private async copyPhotoToDocumentsDir(
    { name, type }: { name: string; type: string },
    width: number,
    height: number,
    uri: string,
  ): Promise<string> {
    const filename = items.getItemDisplayName({ name, type });
    const path = `${this.fileSystemService.photosDirectory}/${filename}`;
    const scale = 1;

    if (Platform.OS === 'android') {
      await RNFS.copyFile(uri, path);
    } else {
      await RNFS.copyAssetsFileIOS(uri, path, width, height, scale);
    }

    return path;
  }

  private async generatePreview({ name }: { name: string; type: string }, uri: string): Promise<string> {
    const path = `${this.fileSystemService.previewsDirectory}/${name}.JPEG`;
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
