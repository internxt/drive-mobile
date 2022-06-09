import RNFS from 'react-native-fs';
import { Photo, Photos, CreatePhotoData } from '@internxt/sdk/dist/photos';

import network from '../../network';
import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import fileSystemService from '../FileSystemService';
import PhotosPreviewService from './PhotosPreviewService';
import { constants } from '../AppService';
import { PHOTOS_PREVIEWS_DIRECTORY } from './constants';

export default class PhotosUploadService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;
  private readonly logService: PhotosLogService;
  private readonly previewService: PhotosPreviewService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: Photos,
    logService: PhotosLogService,
    previewService: PhotosPreviewService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.logService = logService;
    this.previewService = previewService;
  }

  public async upload(data: Omit<CreatePhotoData, 'fileId' | 'previewId'>, uri: string): Promise<[Photo, string]> {
    const {
      size: previewSize,
      path: tmpPreviewPath,
      width: previewWidth,
      height: previewHeight,
      format: previewFormat,
    } = await this.previewService.generate(uri, `${data.name}-${new Date().getTime()}`);

    this.logService.info('Uploading preview image for photo ' + data.name);
    const previewId = await network.uploadFile(
      tmpPreviewPath,
      this.model.user?.bucketId || '',
      this.model.networkCredentials.encryptionKey,
      constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
      {
        user: this.model.networkCredentials.user,
        pass: this.model.networkCredentials.password,
      },
      {},
    );

    this.logService.info('Uploading original image for photo ' + data.name);
    const fileId = await network.uploadFile(
      fileSystemService.uriToPath(uri),
      this.model.user?.bucketId || '',
      this.model.networkCredentials.encryptionKey,
      constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
      {
        user: this.model.networkCredentials.user,
        pass: this.model.networkCredentials.password,
      },
      {},
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
    const finalPreviewPath = `${PHOTOS_PREVIEWS_DIRECTORY}/${createdPhoto.id}`;

    await RNFS.copyFile(tmpPreviewPath, finalPreviewPath);

    return [createdPhoto, fileSystemService.pathToUri(finalPreviewPath)];
  }
}
