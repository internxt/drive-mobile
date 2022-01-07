import { photos } from '@internxt/sdk';
import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';

import { NetworkCredentials, PhotosServiceModel } from '../../types';
import * as network from '../network';
import { getDocumentsDir } from '../../lib/fs';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';

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
      const preview = await this.pullPhoto(this.model.bucket, this.model.networkCredentials, photo.previewId);
      await this.localDatabaseService.insertPhoto(photo, preview);
    }
  }

  private async pullPhoto(
    photosBucket: string,
    networkCredentials: NetworkCredentials,
    fileId: string,
  ): Promise<string> {
    const tmpPath = await network.downloadFile(photosBucket, fileId, networkCredentials, this.model.networkUrl, {
      toPath: getDocumentsDir() + '/' + fileId,
      downloadProgressCallback: () => undefined,
      decryptionProgressCallback: () => undefined,
    });
    const photoSource = await RNFetchBlob.fs.readFile(tmpPath, 'base64');

    await RNFS.unlink(tmpPath);

    return photoSource;
  }
}
