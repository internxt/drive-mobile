import { photos } from '@internxt/sdk';

import { PhotoFileSystemRef, PhotosEventKey, PhotoSizeType } from '../../types/photos';

import PhotosDownloadService from './network/DownloadService';
import PhotosUsageService from './UsageService';
import PhotosPreviewService from './PreviewService';
import { Photo } from '@internxt/sdk/dist/photos';
import { PhotosCommonServices } from './PhotosCommonService';
import fileSystemService from '../FileSystemService';
import { PHOTOS_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_ROOT_DIRECTORY, PHOTOS_TMP_DIRECTORY } from './constants';
import { SdkManager } from '../common/SdkManager';
import { PhotosLocalDatabaseService } from './PhotosLocalDatabaseService';
class PhotosService {
  public static instance: PhotosService;

  private sdk: SdkManager;
  readonly usageService: PhotosUsageService;
  readonly downloadService: PhotosDownloadService;
  readonly previewService: PhotosPreviewService;
  readonly photosLocalDatabase: PhotosLocalDatabaseService;
  constructor(sdk: SdkManager) {
    this.usageService = new PhotosUsageService();
    this.downloadService = new PhotosDownloadService();
    this.previewService = new PhotosPreviewService();
    this.photosLocalDatabase = new PhotosLocalDatabaseService();
    this.sdk = sdk;
  }

  public get isInitialized(): boolean {
    return !!PhotosCommonServices?.model?.isInitialized;
  }

  private async initializeFileSystem() {
    await fileSystemService.mkdir(PHOTOS_TMP_DIRECTORY);
    await fileSystemService.mkdir(PHOTOS_DIRECTORY);
    await fileSystemService.mkdir(PHOTOS_PREVIEWS_DIRECTORY);
  }

  public async startPhotos(): Promise<void> {
    await this.initializeFileSystem();

    if (PhotosCommonServices?.model) {
      PhotosCommonServices.model.isInitialized = true;
    }
  }

  public setSyncAbort(syncAbort: (reason?: string) => void) {
    PhotosCommonServices.model.syncAbort = syncAbort;
  }

  public pauseSync() {
    PhotosCommonServices.events.emit({
      event: PhotosEventKey.PauseSync,
    });
  }

  public async getPhotos({
    limit = 50,
    skip = 0,
  }: {
    limit: number;
    skip?: number;
  }): Promise<{ results: photos.Photo[]; count: number }> {
    const { results, count } = await this.sdk.photos.photos.getPhotos({}, skip, limit);

    return { results, count };
  }

  public async deletePhotos(photos: photos.Photo[]): Promise<void> {
    Promise.all(photos.map(async (photo) => await this.sdk.photos.photos.deletePhotoById(photo.id)));
  }

  public getUsage(): Promise<number> {
    return this.usageService.getUsage();
  }

  /**
   * @description Downloads the photo from the network
   * @param fileId
   * @param options
   * @returns The photo path in the file system
   */
  public async downloadPhoto(
    downloadParams: {
      photoFileId: string;
    },
    options: {
      destination: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<PhotoFileSystemRef> {
    return this.downloadService.download(downloadParams.photoFileId, options);
  }

  public async clear(): Promise<void> {
    await this.photosLocalDatabase.clear();
    const existsRoot = await fileSystemService.exists(PHOTOS_TMP_DIRECTORY);
    if (existsRoot) {
      await fileSystemService.unlink(PHOTOS_TMP_DIRECTORY);
      await fileSystemService.unlink(PHOTOS_ROOT_DIRECTORY);
    }
  }

  public async getPreview(photo: Photo): Promise<PhotoFileSystemRef | null> {
    const localPreview = await this.previewService.getLocalPreview(photo);

    if (localPreview) {
      return fileSystemService.pathToUri(localPreview);
    }

    const photoRemotePreviewData = this.getPhotoRemotePreviewData(photo);

    if (photoRemotePreviewData) {
      const destinationPath = PhotosCommonServices.getPhotoPath({
        name: photo.name,
        size: PhotoSizeType.Preview,
        type: photo.type,
      });

      const photoPreviewRef = await this.downloadPhoto(
        {
          photoFileId: photoRemotePreviewData.fileId,
        },
        {
          destination: destinationPath,
          decryptionProgressCallback: () => undefined,
          downloadProgressCallback: () => undefined,
        },
      );

      return fileSystemService.pathToUri(photoPreviewRef);
    }

    return null;
  }

  private getPhotoRemotePreviewData(photo: Photo) {
    const photoRemotePreview =
      photo.previewId && photo.previews
        ? photo.previews.find((preview) => preview.fileId === photo.previewId)
        : undefined;

    return photoRemotePreview;
  }
}

export default new PhotosService(SdkManager.getInstance());
