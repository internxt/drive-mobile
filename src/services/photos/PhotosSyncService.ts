import { photos } from '@internxt/sdk';

import { PhotosServiceModel, PhotosSyncInfo, PhotosSyncTaskType } from '../../types/photos';
import PhotosCameraRollService from './PhotosCameraRollService';
import PhotosDownloadService from './PhotosDownloadService';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosLogService from './PhotosLogService';
import PhotosUploadService from './PhotosUploadService';

export default class PhotosSyncService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  private readonly cameraRollService: PhotosCameraRollService;
  private readonly uploadService: PhotosUploadService;
  private readonly downloadService: PhotosDownloadService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly logService: PhotosLogService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: photos.Photos,
    cameraRollService: PhotosCameraRollService,
    uploadService: PhotosUploadService,
    downloadService: PhotosDownloadService,
    localDatabaseService: PhotosLocalDatabaseService,
    logService: PhotosLogService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.cameraRollService = cameraRollService;
    this.uploadService = uploadService;
    this.downloadService = downloadService;
    this.localDatabaseService = localDatabaseService;
    this.logService = logService;
  }

  public async run(options: {
    onStart?: (tasksInfo: PhotosSyncInfo) => void;
    onTaskCompleted?: (result: { taskType: PhotosSyncTaskType; photo: photos.Photo; completedTasks: number }) => void;
  }): Promise<void> {
    try {
      let completedTasks = 0;
      const onTaskCompletedFactory = (taskType: PhotosSyncTaskType) => (photo: photos.Photo) => {
        completedTasks++;
        options.onTaskCompleted?.({ taskType, photo, completedTasks });
      };

      this.logService.info('[SYNC-MAIN]: STARTED');

      if (!this.model.user) {
        throw new Error('photos user not initialized');
      }

      if (!this.model.device) {
        throw new Error('photos device not initialized');
      }

      const syncInfo = await this.calculateSyncInfo();
      options.onStart?.(syncInfo);
      this.logService.info(
        `[SYNC-MAIN]: CALCULATED ${syncInfo.totalTasks} TASKS: ${syncInfo.downloadTasks} downloadTasks, ${syncInfo.newerUploadTasks} newerUploadTasks, ${syncInfo.olderUploadTasks} olderUploadTasks`,
      );

      await this.downloadRemotePhotos({ onPhotoDownloaded: onTaskCompletedFactory(PhotosSyncTaskType.Download) });
      this.logService.info('[SYNC-MAIN]: REMOTE PHOTOS DOWNLOADED');

      const newestDate = await this.localDatabaseService.getNewestDate();
      const oldestDate = await this.localDatabaseService.getOldestDate();

      await this.uploadLocalPhotos(this.model.user.id, this.model.device.id, {
        from: newestDate,
        onPhotoUploaded: onTaskCompletedFactory(PhotosSyncTaskType.Upload),
      });
      this.logService.info('[SYNC-MAIN]: NEWER LOCAL PHOTOS UPLOADED');

      if (!oldestDate) {
        this.logService.info('[SYNC-MAIN]: SKIPPED OLDER LOCAL PHOTOS UPLOAD');
      } else {
        await this.uploadLocalPhotos(this.model.user.id, this.model.device.id, {
          to: oldestDate,
          onPhotoUploaded: onTaskCompletedFactory(PhotosSyncTaskType.Upload),
        });
        this.logService.info('[SYNC-MAIN]: OLDER LOCAL PHOTOS UPLOADED');
      }

      this.logService.info('[SYNC-MAIN]: FINISHED');
    } catch (err) {
      this.logService.info('[SYNC-MAIN]: FAILED:' + err);
      throw err;
    }
  }

  private async calculateSyncInfo(): Promise<PhotosSyncInfo> {
    const remoteSyncAt = await this.localDatabaseService.getRemoteSyncAt();
    const newestDate = await this.localDatabaseService.getNewestDate();
    const oldestDate = await this.localDatabaseService.getOldestDate();
    const { count: downloadTasks } = await this.photosSdk.photos.getPhotos({ statusChangedAt: remoteSyncAt });
    const cameraRollCount = await this.cameraRollService.count({});
    const newerUploadTasks = await this.cameraRollService.count({ from: newestDate });
    const olderUploadTasks = oldestDate ? await this.cameraRollService.count({ to: oldestDate }) : 0;

    return {
      totalTasks: downloadTasks + newerUploadTasks + olderUploadTasks,
      cameraRollCount,
      downloadTasks,
      newerUploadTasks,
      olderUploadTasks,
    };
  }

  /**
   * @description Downloads remote photos whose status changed after the last update
   */
  private async downloadRemotePhotos(options: { onPhotoDownloaded: (photo: photos.Photo) => void }): Promise<void> {
    const remoteSyncAt = await this.localDatabaseService.getRemoteSyncAt();
    const now = new Date();
    const limit = 25;
    let skip = 0;
    let photos;

    this.logService.info('[SYNC-REMOTE]: LAST SYNC WAS AT ' + remoteSyncAt.toUTCString());

    do {
      const { results } = await this.photosSdk.photos.getPhotos({ statusChangedAt: remoteSyncAt }, skip, limit);

      photos = results;

      for (const photo of photos) {
        await this.downloadService.downloadPhoto(photo);
        options.onPhotoDownloaded(photo);
      }

      skip += limit;
    } while (photos.length === limit);

    /**
     * BE CAREFUL WITH CONCURRENCY
     *
     * This date should be as precise as possible without excluding any remote
     * photo. Is better to realize and skip that 3 or 4 photos already synced
     * because you store the date where you begin to sync (so concurrent uploads
     * from other devices could be already downloaded by you) instead of skipping
     * photos forever. In the moment where this date is newer that a photo not
     * downloaded, this photo will be ignored until its state changes.
     *
     * To avoid this issue but keep using an efficient way to sync supported by
     * dates and acoted ranges, try to avoid skipping anything
     */
    await this.localDatabaseService.setRemoteSyncAt(now);
  }

  /**
   * @description Uploads new local photos
   */
  async uploadLocalPhotos(
    userId: photos.UserId,
    deviceId: photos.DeviceId,
    options: { from?: Date; to?: Date; onPhotoUploaded: (photo: photos.Photo) => void },
  ): Promise<void> {
    const limit = 25;
    let cursor: string | undefined;
    let photosToUpload: { data: Omit<photos.CreatePhotoData, 'fileId' | 'previewId'>; uri: string }[];

    this.logService.info(`[SYNC-LOCAL]: UPLOADING LOCAL PHOTOS FROM ${options.from} TO ${options.to}`);

    do {
      const [galleryPhotos, nextCursor] = await this.cameraRollService.loadLocalPhotos({
        from: options.from,
        to: options.to,
        limit,
        cursor,
      });

      photosToUpload = galleryPhotos.map<{ data: Omit<photos.CreatePhotoData, 'fileId' | 'previewId'>; uri: string }>(
        (p) => {
          const nameWithExtension = p.node.image.filename as string;
          const nameWithoutExtension = nameWithExtension.substring(0, nameWithExtension.lastIndexOf('.'));
          const nameSplittedByDots = nameWithExtension.split('.');
          const extension = nameSplittedByDots[nameSplittedByDots.length - 1] || '';

          return {
            data: {
              takenAt: new Date(p.node.timestamp * 1000),
              userId: userId,
              deviceId: deviceId,
              height: p.node.image.height,
              width: p.node.image.width,
              size: p.node.image.fileSize as number,
              type: extension,
              name: nameWithoutExtension,
            },
            uri: p.node.image.uri,
          };
        },
      );

      cursor = nextCursor;

      for (const photo of photosToUpload) {
        /**
         * WARNING: Camera roll does not filter properly by dates for photos with
         * small deltas which can provoke the sync to re-update the last photo already
         * uploaded or photos that have very similar timestamp by miliseconds
         * (like photos bursts)
         */
        const alreadyExistentPhoto = await this.localDatabaseService.getPhotoByNameAndType(
          photo.data.name,
          photo.data.type,
        );

        if (alreadyExistentPhoto) {
          this.logService.info(`[SYNC-LOCAL]: ${photo.data.name} IS ALREADY UPLOADED, SKIPPING`);
          continue;
        }

        const [createdPhoto, preview] = await this.uploadService.upload(photo.data, photo.uri);

        await this.localDatabaseService.insertPhoto(createdPhoto, preview);

        options.onPhotoUploaded?.(createdPhoto);
      }
    } while (cursor);
  }
}
