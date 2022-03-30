import RNFS from 'react-native-fs';
import { Photo, Photos, CreatePhotoData } from '@internxt/sdk/dist/photos';

import * as network from '../network';
import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import PhotosFileSystemService from './PhotosFileSystemService';
import { pathToUri, uriToPath } from '../fileSystem';
import PhotosPreviewService from './PhotosPreviewService';

export default class PhotosUploadService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;
  private readonly logService: PhotosLogService;
  private readonly fileSystemService: PhotosFileSystemService;
  private readonly previewService: PhotosPreviewService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: Photos,
    logService: PhotosLogService,
    fileSystemService: PhotosFileSystemService,
    previewService: PhotosPreviewService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.logService = logService;
    this.fileSystemService = fileSystemService;
    this.previewService = previewService;
  }

  public async upload(data: Omit<CreatePhotoData, 'fileId' | 'previewId'>, uri: string): Promise<[Photo, string]> {
    const {
      size: previewSize,
      path: tmpPreviewPath,
      width: previewWidth,
      height: previewHeight,
      format: previewFormat,
    } = await this.previewService.generate(
      uri,
      this.fileSystemService.tmpDirectory,
      `${data.name}-${new Date().getTime()}`,
    );

    this.logService.info('Uploading preview image for photo ' + data.name);
    const previewId = await network.uploadFile(
      tmpPreviewPath,
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    this.logService.info('Uploading original image for photo ' + data.name);
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
      previews: [
        {
          width: previewWidth,
          height: previewHeight,
          size: previewSize,
          fileId: previewId,
          // TODO: update @internxt/sdk on next release to fix types
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          type: previewFormat,
        },
      ],
      hash,
    };
    const createdPhoto = await this.photosSdk.photos.createPhoto(createPhotoData);
    const finalPreviewPath = `${this.fileSystemService.previewsDirectory}/${createdPhoto.id}.${previewFormat}`;

    await RNFS.copyFile(tmpPreviewPath, finalPreviewPath);

    return [createdPhoto, pathToUri(finalPreviewPath)];
  }
}
