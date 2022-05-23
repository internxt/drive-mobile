import { photos } from '@internxt/sdk';
import { PhotoStatus } from '@internxt/sdk/dist/photos';
import { PhotosServiceModel } from '../../types/photos';

import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosLogService from './PhotosLogService';

export default class PhotosDeleteService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly logService: PhotosLogService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: photos.Photos,
    localDatabaseService: PhotosLocalDatabaseService,
    logService: PhotosLogService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.localDatabaseService = localDatabaseService;
    this.logService = logService;
  }

  public async delete(photo: photos.Photo): Promise<void> {
    await this.photosSdk.photos.deletePhotoById(photo.id);
    await this.localDatabaseService.updatePhotoStatusById(photo.id, PhotoStatus.Trashed);
  }
}
