import { REACT_NATIVE_PHOTOS_API_URL } from '@env';
import { photos } from '@internxt/sdk';

import { PhotosServiceModel } from '../../types';

import { NetworkCredentials } from '../../types';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosUploadService from './PhotosUploadService';
import PhotosDeleteService from './PhotosDeleteService';
import PhotosSyncService from './PhotosSyncService';
import PhotosCameraRollService from './PhotosCameraRollService';
import PhotosDownloadService from './PhotosDownloadService';

export class PhotosService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  private readonly cameraRollService: PhotosCameraRollService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly uploadService: PhotosUploadService;
  private readonly downloadService: PhotosDownloadService;
  private readonly deleteService: PhotosDeleteService;
  private readonly syncService: PhotosSyncService;

  constructor(accessToken: string, networkCredentials: NetworkCredentials) {
    this.model = {
      accessToken,
      bucket: '',
      networkCredentials,
    };
    this.photosSdk = new photos.Photos(REACT_NATIVE_PHOTOS_API_URL, accessToken);

    this.cameraRollService = new PhotosCameraRollService();
    this.localDatabaseService = new PhotosLocalDatabaseService(this.model);
    this.uploadService = new PhotosUploadService(this.model, this.photosSdk);
    this.downloadService = new PhotosDownloadService(this.model, this.localDatabaseService);
    this.deleteService = new PhotosDeleteService(this.model, this.photosSdk);
    this.syncService = new PhotosSyncService(
      this.model,
      this.photosSdk,
      this.cameraRollService,
      this.uploadService,
      this.downloadService,
      this.deleteService,
      this.localDatabaseService,
    );
  }

  public async initializeLocalDatabase(): Promise<void> {
    await this.localDatabaseService.initialize();

    console.log('(PhotosService) Local database initialized');
  }

  public sync(): Promise<void> {
    return this.syncService.run();
  }

  public countPhotos(): Promise<number> {
    return this.localDatabaseService.countPhotos();
  }

  public getPhotos({ limit, offset = 0 }: { limit: number; offset?: number }): Promise<photos.Photo[]> {
    this.checkModel();

    return this.localDatabaseService.getPhotos(offset, limit);
  }

  public deletePhoto(photo: photos.Photo): Promise<void> {
    this.checkModel();

    return this.deleteService.delete(photo);
  }

  private checkModel() {
    if (this.model.bucket) {
      throw new Error('(PhotosService) bucketId not found');
    }
  }
}
