import { photos } from '@internxt/sdk';

import { constants } from '../app';
import { RootState } from '../../store';
import { NetworkCredentials } from '../../types';
import {
  PhotosEventKey,
  PhotosServiceModel,
  PhotosSyncInfo,
  PhotosSyncTaskType,
  PhotosTaskCompletedInfo,
} from '../../types/photos';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosUploadService from './PhotosUploadService';
import PhotosDeleteService from './PhotosDeleteService';
import PhotosSyncService from './PhotosSyncService';
import PhotosCameraRollService from './PhotosCameraRollService';
import PhotosDownloadService from './PhotosDownloadService';
import PhotosDeviceService from './PhotosDeviceService';
import PhotosUserService from './PhotosUserService';
import PhotosLogService from './PhotosLogService';
import PhotosFileSystemService from './PhotosFileSystemService';
import PhotosUsageService from './PhotosUsageService';
import PhotosPreviewService from './PhotosPreviewService';
import PhotosEventEmitter from './PhotosEventEmitter';

export class PhotosService {
  public static instance: PhotosService;
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  private readonly logService: PhotosLogService;
  private readonly eventEmitter: PhotosEventEmitter;
  private readonly fileSystemService: PhotosFileSystemService;
  private readonly cameraRollService: PhotosCameraRollService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly usageService: PhotosUsageService;
  private readonly deviceService: PhotosDeviceService;
  private readonly userService: PhotosUserService;
  private readonly uploadService: PhotosUploadService;
  private readonly downloadService: PhotosDownloadService;
  private readonly deleteService: PhotosDeleteService;
  private readonly syncService: PhotosSyncService;
  private readonly previewService: PhotosPreviewService;

  private constructor(accessToken: string, networkCredentials: NetworkCredentials) {
    this.model = {
      debug: constants.REACT_NATIVE_DEBUG,
      isInitialized: false,
      accessToken,
      networkCredentials,
      networkUrl: constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL || '',
    };
    this.photosSdk = new photos.Photos(constants.REACT_NATIVE_PHOTOS_API_URL || '', accessToken);

    this.logService = new PhotosLogService(this.model);
    this.eventEmitter = new PhotosEventEmitter(this.model);
    this.fileSystemService = new PhotosFileSystemService(this.model, this.logService);
    this.localDatabaseService = new PhotosLocalDatabaseService(this.model, this.logService, this.fileSystemService);
    this.cameraRollService = new PhotosCameraRollService(this.logService, this.localDatabaseService);
    this.usageService = new PhotosUsageService(this.model);
    this.deviceService = new PhotosDeviceService(
      this.model,
      this.photosSdk,
      this.localDatabaseService,
      this.logService,
    );
    this.downloadService = new PhotosDownloadService(this.model);
    this.userService = new PhotosUserService(this.model, this.photosSdk, this.deviceService, this.logService);
    this.previewService = new PhotosPreviewService(
      this.model,
      this.photosSdk,
      this.fileSystemService,
      this.downloadService,
    );
    this.uploadService = new PhotosUploadService(
      this.model,
      this.photosSdk,
      this.logService,
      this.fileSystemService,
      this.previewService,
    );
    this.deleteService = new PhotosDeleteService(
      this.model,
      this.photosSdk,
      this.localDatabaseService,
      this.logService,
    );
    this.syncService = new PhotosSyncService(
      this.model,
      this.photosSdk,
      this.eventEmitter,
      this.deviceService,
      this.cameraRollService,
      this.uploadService,
      this.downloadService,
      this.localDatabaseService,
      this.logService,
      this.fileSystemService,
    );

    this.eventEmitter.addListener({
      event: PhotosEventKey.CancelSync,
      listener: () => {
        this.onSyncCanceled();
      },
    });
  }

  public get isInitialized(): boolean {
    return this.model.isInitialized;
  }

  public get photosDirectory(): string {
    return this.fileSystemService.photosDirectory;
  }

  public get previewsDirectory(): string {
    return this.fileSystemService.previewsDirectory;
  }

  public static async initialize(accessToken: string, networkCredentials: NetworkCredentials): Promise<void> {
    PhotosService.instance = new PhotosService(accessToken, networkCredentials);
  }

  public async startUsingPhotos(): Promise<void> {
    await this.fileSystemService.initialize();
    await this.localDatabaseService.initialize();
    await this.userService.initialize();
    await this.deviceService.initialize();

    this.model.isInitialized = true;
  }

  public addListener({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: PhotosEventKey;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void;
  }): void {
    return this.eventEmitter.addListener({ id, event, listener });
  }

  public removeListener({
    id,
    event,
    listener,
  }: {
    id?: string;
    event: PhotosEventKey;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (...args: any[]) => void;
  }) {
    return this.eventEmitter.removeListener({ id, event, listener });
  }

  /**
   * @description Runs the synchronization process
   * !!! TODO: Delete 'getState' property from 'options' and check limit on server
   * @param options
   * @returns
   */
  public sync(options: {
    id?: string;
    signal?: AbortSignal;
    getState: () => RootState;
    onStart?: (tasksInfo: PhotosSyncInfo) => void;
    onTaskSkipped?: () => void;
    onTaskCompleted?: (result: {
      taskType: PhotosSyncTaskType;
      photo: photos.Photo;
      completedTasks: number;
      info: PhotosTaskCompletedInfo;
    }) => void;
    onStorageLimitReached: () => void;
  }): Promise<void> {
    return this.syncService.run(options);
  }

  public setSyncAbort(syncAbort: (reason?: string) => void) {
    this.model.syncAbort = syncAbort;
  }

  public cancelSync() {
    this.eventEmitter.emit({ event: PhotosEventKey.CancelSync });
  }

  public countPhotos(): Promise<number> {
    return this.localDatabaseService.countPhotos();
  }

  public async getPhotos({
    limit,
    skip = 0,
  }: {
    limit: number;
    skip?: number;
  }): Promise<{ data: photos.Photo; preview: string }[]> {
    this.checkModel();

    const results = await this.localDatabaseService.getPhotos(skip, limit);
    return results;
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
    return this.localDatabaseService.getAll();
  }

  public deletePhoto(photo: photos.Photo): Promise<void> {
    this.checkModel();

    return this.deleteService.delete(photo);
  }

  public getUsage(): Promise<number> {
    return this.usageService.getUsage();
  }

  /**
   * @description Generates and updates a photo preview
   * @param photo
   * @returns
   */
  public async updatePhotoPreview(photo: photos.Photo): Promise<void> {
    return this.previewService.update(photo);
  }

  /**
   * @description Downloads the photo from the network
   * @param fileId
   * @param options
   * @returns The photo path in the file system
   */
  public downloadPhoto(
    fileId: string,
    options: {
      toPath: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<string> {
    this.checkModel();

    return this.downloadService.pullPhoto(fileId, options);
  }

  /**
   * @description Clears all photos data from device
   */
  public async clearData(): Promise<void> {
    await this.fileSystemService.clear();
    await this.localDatabaseService.resetDatabase();
  }

  private onSyncCanceled() {
    this.model.syncAbort?.();
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
