import { photos } from '@internxt/sdk';

import { PhotosServiceModel } from '../../types';
import * as network from '../network';

export default class PhotosDeleteService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  constructor(model: PhotosServiceModel, photosSdk: photos.Photos) {
    this.model = model;
    this.photosSdk = photosSdk;
  }

  public async delete(photo: photos.Photo): Promise<void> {
    await network.deleteFile(photo.previewId, this.model.bucket, this.model.networkCredentials);
    await network.deleteFile(photo.fileId, this.model.bucket, this.model.networkCredentials);

    await this.photosSdk.photos.deletePhotoById(photo.id);
  }
}
