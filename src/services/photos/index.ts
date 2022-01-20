import { photos } from '@internxt/sdk';

import { NetworkCredentials } from '../../types';
import { PhotosServiceModel, PhotosSyncInfo, PhotosSyncTaskType } from '../../types/photos';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosUploadService from './PhotosUploadService';
import PhotosDeleteService from './PhotosDeleteService';
import PhotosSyncService from './PhotosSyncService';
import PhotosCameraRollService from './PhotosCameraRollService';
import PhotosDownloadService from './PhotosDownloadService';
import PhotosDeviceService from './PhotosDeviceService';
import PhotosUserService from './PhotosUserService';

export class PhotosService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  private readonly cameraRollService: PhotosCameraRollService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly deviceService: PhotosDeviceService;
  private readonly userService: PhotosUserService;
  private readonly uploadService: PhotosUploadService;
  private readonly downloadService: PhotosDownloadService;
  private readonly deleteService: PhotosDeleteService;
  private readonly syncService: PhotosSyncService;

  constructor(accessToken: string, networkCredentials: NetworkCredentials) {
    this.model = {
      isInitialized: false,
      accessToken,
      networkCredentials,
      networkUrl: process.env.REACT_NATIVE_PHOTOS_NETWORK_API_URL || '',
    };
    this.photosSdk = new photos.Photos(process.env.REACT_NATIVE_PHOTOS_API_URL || '', accessToken);

    this.cameraRollService = new PhotosCameraRollService();
    this.localDatabaseService = new PhotosLocalDatabaseService(this.model);
    this.deviceService = new PhotosDeviceService(this.model, this.photosSdk, this.localDatabaseService);
    this.userService = new PhotosUserService(this.model, this.photosSdk, this.deviceService);
    this.uploadService = new PhotosUploadService(this.model, this.photosSdk);
    this.downloadService = new PhotosDownloadService(this.model, this.localDatabaseService);
    this.deleteService = new PhotosDeleteService(this.model, this.photosSdk, this.localDatabaseService);
    this.syncService = new PhotosSyncService(
      this.model,
      this.photosSdk,
      this.cameraRollService,
      this.uploadService,
      this.downloadService,
      this.localDatabaseService,
    );
  }

  public get isInitialized(): boolean {
    return this.model.isInitialized;
  }

  public async initialize(): Promise<void> {
    await this.localDatabaseService.initialize();
    await this.userService.initialize();
    await this.deviceService.initialize();

    this.model.isInitialized = true;

    console.log('(PhotosService) initialized');
  }

  public sync(options: {
    onStart?: (tasksInfo: PhotosSyncInfo) => void;
    onTaskCompleted?: (result: { taskType: PhotosSyncTaskType; photo: photos.Photo; completedTasks: number }) => void;
  }): Promise<void> {
    return this.syncService.run(options);
  }

  public countPhotos(): Promise<number> {
    return this.localDatabaseService.countPhotos();
  }

  public getPhotos({
    limit,
    skip = 0,
  }: {
    limit: number;
    skip?: number;
  }): Promise<{ data: photos.Photo; preview: string }[]> {
    this.checkModel();

    return this.localDatabaseService.getPhotos(skip, limit);
  }

  public getYearsList(): Promise<{ year: number; preview: string }[]> {
    return this.localDatabaseService.getYearsList();
  }

  public getMonthsList(): Promise<{ year: number; month: number; preview: string }[]> {
    return this.localDatabaseService.getMonthsList();
  }

  public getPhotoPreview(photoId: string): Promise<string | null> {
    return this.localDatabaseService.getPhotoPreview(photoId);
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

  public clearData(): Promise<void> {
    return this.localDatabaseService.resetDatabase();
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
