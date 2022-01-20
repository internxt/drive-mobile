import { photos } from '@internxt/sdk';
import RNFS from 'react-native-fs';

import { NetworkCredentials } from '../../types';
import * as network from '../network';
import { getDocumentsDir } from '../fileSystem';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import { PhotosServiceModel } from '../../types/photos';
import imageService from '../image';

export default class PhotosDownloadService {
  private readonly model: PhotosServiceModel;

  private readonly localDatabaseService: PhotosLocalDatabaseService;

  constructor(model: PhotosServiceModel, localDatabaseService: PhotosLocalDatabaseService) {
    this.model = model;
    this.localDatabaseService = localDatabaseService;
  }

  public async downloadPhoto(photo: photos.Photo): Promise<void> {
    const photoIsOnTheDevice = !!(await this.localDatabaseService.getPhotoById(photo.id));

    console.log('Photo ' + photo.name + ' is on the device? ' + photoIsOnTheDevice);

    if (photoIsOnTheDevice) {
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
      const preview = await imageService.pathToBase64(previewPath);
      await RNFS.unlink(previewPath);
      await this.localDatabaseService.insertPhoto(photo, preview);
    }
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
