import { photos } from '@internxt/sdk';

import { PhotoFileSystemRef, PhotosEventKey, PhotoSizeType } from '../../types/photos';
import PhotosUploadService from './UploadService';
import PhotosDownloadService from './DownloadService';
import PhotosUserService from './PhotosUserService';
import PhotosUsageService from './UsageService';
import PhotosPreviewService from './PreviewService';
import { Photo, PhotoId } from '@internxt/sdk/dist/photos';
import { PhotosCommonServices } from './PhotosCommonService';
import fileSystemService from '../FileSystemService';
import { PHOTOS_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_ROOT_DIRECTORY, PHOTOS_TMP_DIRECTORY } from './constants';
export class PhotosService {
  public static instance: PhotosService;

  private readonly usageService: PhotosUsageService;
  private readonly userService: PhotosUserService;
  private readonly downloadService: PhotosDownloadService;
  private readonly uploadService: PhotosUploadService;
  private readonly previewService: PhotosPreviewService;

  private constructor() {
    this.usageService = new PhotosUsageService();
    this.downloadService = new PhotosDownloadService();
    this.userService = new PhotosUserService();
    this.previewService = new PhotosPreviewService();
    this.uploadService = new PhotosUploadService();
  }

  public get isInitialized(): boolean {
    return !!PhotosCommonServices?.model?.isInitialized;
  }

  public static initialize() {
    PhotosService.instance = new PhotosService();
  }

  private async initializeFileSystem() {
    await fileSystemService.mkdir(PHOTOS_TMP_DIRECTORY);
    await fileSystemService.mkdir(PHOTOS_DIRECTORY);
    await fileSystemService.mkdir(PHOTOS_PREVIEWS_DIRECTORY);
  }

  public async startPhotos(): Promise<void> {
    await this.initializeFileSystem();
    await this.userService.initialize();

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

  public async getPhotos({ limit = 50, skip = 0 }: { limit: number; skip?: number }): Promise<photos.Photo[]> {
    this.checkModel();

    if (!PhotosCommonServices.sdk) {
      throw new Error('Sdk not initialized');
    }
    const { results } = await PhotosCommonServices.sdk.photos.getPhotos({}, skip, limit);

    return results;
  }

  public async deletePhoto(photo: photos.Photo): Promise<void> {
    this.checkModel();
    if (!PhotosCommonServices.sdk) {
      throw new Error('Sdk not initialized');
    }
    await PhotosCommonServices.sdk.photos.deletePhotoById(photo.id);
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
      photoId: PhotoId;
    },
    options: {
      destination: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<PhotoFileSystemRef> {
    this.checkModel();

    return this.downloadService.download(downloadParams.photoId, options);
  }

  public async clearData(): Promise<void> {
    await fileSystemService.unlink(PHOTOS_TMP_DIRECTORY);
    await fileSystemService.unlink(PHOTOS_ROOT_DIRECTORY);
  }

  public async getPreview(photo: Photo): Promise<PhotoFileSystemRef | null> {
    const localPreview = await this.previewService.getLocalPreview(photo);

    if (localPreview) {
      return localPreview;
    }

    const photoRemotePreviewData = this.getPhotoRemotePreviewData(photo);

    if (photoRemotePreviewData) {
      const params = {
        photoId: photoRemotePreviewData.fileId,
        format: photo.type,
        type: PhotoSizeType.Preview,
      };
      const photoPreviewRef = await this.downloadPhoto(params, {
        destination: this.getFileSystemRef(params),
        decryptionProgressCallback: () => undefined,
        downloadProgressCallback: () => undefined,
      });

      return photoPreviewRef;
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

  private getFileSystemRef({
    photoId,
    format,
    type,
  }: {
    photoId: PhotoFileSystemRef;
    format: string;
    type: 'PREVIEW' | 'FULL_SIZE';
  }) {
    return `${type === 'PREVIEW' ? PHOTOS_PREVIEWS_DIRECTORY : PHOTOS_DIRECTORY}/${photoId}.${format}`;
  }

  private get bucketId() {
    return PhotosCommonServices.model.user?.bucketId || '';
  }

  private checkModel() {
    if (!this.bucketId) {
      throw new Error('(PhotosService) bucketId not found');
    }
  }
}
