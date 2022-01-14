import { photos } from '@internxt/sdk';
import { PhotoStatus } from '@internxt/sdk/dist/photos';
import { PhotosServiceModel } from '../../types/photos';

import * as network from '../network';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';

export default class PhotosDeleteService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;
  private readonly localDatabaseService: PhotosLocalDatabaseService;

  constructor(model: PhotosServiceModel, photosSdk: photos.Photos, localDatabaseService: PhotosLocalDatabaseService) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.localDatabaseService = localDatabaseService;
  }

  public async delete(photo: photos.Photo): Promise<void> {
    await network.deleteFile(photo.previewId, this.model.user?.bucketId || '', this.model.networkCredentials);
    await network.deleteFile(photo.fileId, this.model.user?.bucketId || '', this.model.networkCredentials);
    await this.photosSdk.photos.deletePhotoById(photo.id);

    await this.localDatabaseService.updatePhotoStatusById(photo.id, PhotoStatus.Trashed);
  }
}
