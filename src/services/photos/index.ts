import { photos } from '@internxt/sdk';
import { getMacAddress, getDeviceName } from 'react-native-device-info';

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
      networkCredentials,
      networkUrl: process.env.REACT_NATIVE_PHOTOS_NETWORK_API_URL || '',
    };
    this.photosSdk = new photos.Photos(process.env.REACT_NATIVE_PHOTOS_API_URL || '', accessToken);

    this.cameraRollService = new PhotosCameraRollService();
    this.localDatabaseService = new PhotosLocalDatabaseService(this.model);
    this.uploadService = new PhotosUploadService(this.model, this.photosSdk);
    this.downloadService = new PhotosDownloadService(this.model, this.localDatabaseService);
    this.deleteService = new PhotosDeleteService(this.model, this.photosSdk, this.localDatabaseService);
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

  public async initializeUser(): Promise<photos.User> {
    const mac = await getMacAddress();
    const name = await getDeviceName();
    const user = await this.photosSdk.users.initialize({
      mac,
      name,
      bridgeUser: this.model.networkCredentials.user,
      bridgePassword: this.model.networkCredentials.password,
    });

    this.model.user = user;

    console.log('(PhotosService) User initialized');

    return user;
  }

  public sync(): Promise<void> {
    return this.syncService.run();
  }

  public countPhotos(): Promise<number> {
    return this.localDatabaseService.countPhotos();
  }

  public getPhotos({
    limit,
    offset = 0,
  }: {
    limit: number;
    offset?: number;
  }): Promise<{ data: photos.Photo; preview: string }[]> {
    this.checkModel();

    return this.localDatabaseService.getPhotos(offset, limit);
  }

  public getAll(): Promise<photos.Photo[]> {
    return this.localDatabaseService.getAllWithoutPreview();
  }

  public deletePhoto(photo: photos.Photo): Promise<void> {
    this.checkModel();

    return this.deleteService.delete(photo);
  }

  public downloadPhoto(
    fileId: string,
    options: {
      toPath: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<string> {
    this.checkModel();

    return this.downloadService.pullPhoto(this.bucketId, this.model.networkCredentials, fileId, options);
  }

  private get bucketId() {
    return this.model.user?.bucketId || '';
  }

  private checkModel() {
    if (!this.bucketId) {
      throw new Error('(PhotosService) bucketId not found');
    }
  }
}
