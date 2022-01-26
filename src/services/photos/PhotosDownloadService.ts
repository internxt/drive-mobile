import { photos } from '@internxt/sdk';

import { NetworkCredentials } from '../../types';
import * as network from '../network';
import { getDocumentsDir } from '../fileSystem';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';

export default class PhotosDownloadService {
  private readonly model: PhotosServiceModel;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly logService: PhotosLogService;

  constructor(
    model: PhotosServiceModel,
    localDatabaseService: PhotosLocalDatabaseService,
    logService: PhotosLogService,
  ) {
    this.model = model;
    this.localDatabaseService = localDatabaseService;
    this.logService = logService;
  }

  public async downloadPhoto(photo: photos.Photo): Promise<boolean> {
    const isAlreadyOnTheDevice = !!(await this.localDatabaseService.getPhotoById(photo.id));

    this.logService.info('Photo ' + photo.name + ' is on the device? ' + isAlreadyOnTheDevice);

    if (isAlreadyOnTheDevice) {
      await this.localDatabaseService.updatePhotoStatusById(photo.id, photo.status);
    } else {
      const previewPath = await this.pullPhoto(
        this.model.user?.bucketId || '',
        this.model.networkCredentials,
        photo.previewId,
        {
          toPath: getDocumentsDir() + '/' + photo.previewId,
          downloadProgressCallback: () => undefined,
          decryptionProgressCallback: () => undefined,
        },
      );
      await this.localDatabaseService.insertPhoto(photo, previewPath);
    }

    return isAlreadyOnTheDevice;
  }

  public async pullPhoto(
    photosBucket: string,
    networkCredentials: NetworkCredentials,
    fileId: string,
    options: {
      toPath: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<string> {
    const tmpPath = await network.downloadFile(photosBucket, fileId, networkCredentials, this.model.networkUrl, {
      ...options,
    });

    return tmpPath;
  }
}
