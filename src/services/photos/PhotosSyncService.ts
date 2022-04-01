import { photos } from '@internxt/sdk';
const { PhotoStatus } = photos;
import strings from '../../../assets/lang/strings';
import { RootState } from '../../store';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { items } from '@internxt/lib';
import moment from 'moment';

import {
  PhotosServiceModel,
  PhotosSyncInfo,
  PhotosSyncTaskType,
  PhotosTaskCompletedInfo,
  PhotosCameraRollGetPhotosResponse,
  PhotosEventKey,
} from '../../types/photos';
import PhotosDeviceService from './PhotosDeviceService';
import PhotosCameraRollService from './PhotosCameraRollService';
import PhotosDownloadService from './PhotosDownloadService';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosLogService from './PhotosLogService';
import PhotosUploadService from './PhotosUploadService';
import PhotosFileSystemService from './PhotosFileSystemService';
import PhotosEventEmitter from './PhotosEventEmitter';

export default class PhotosSyncService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  private readonly eventEmitter: PhotosEventEmitter;
  private readonly deviceService: PhotosDeviceService;
  private readonly cameraRollService: PhotosCameraRollService;
  private readonly uploadService: PhotosUploadService;
  private readonly downloadService: PhotosDownloadService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly logService: PhotosLogService;
  private readonly fileSystemService: PhotosFileSystemService;

  private currentSyncId = '';

  constructor(
    model: PhotosServiceModel,
    photosSdk: photos.Photos,
    eventEmitter: PhotosEventEmitter,
    deviceService: PhotosDeviceService,
    cameraRollService: PhotosCameraRollService,
    uploadService: PhotosUploadService,
    downloadService: PhotosDownloadService,
    localDatabaseService: PhotosLocalDatabaseService,
    logService: PhotosLogService,
    fileSystemService: PhotosFileSystemService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.eventEmitter = eventEmitter;
    this.deviceService = deviceService;
    this.cameraRollService = cameraRollService;
    this.uploadService = uploadService;
    this.downloadService = downloadService;
    this.localDatabaseService = localDatabaseService;
    this.logService = logService;
    this.fileSystemService = fileSystemService;
  }

  public async run(options: {
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
    try {
      this.currentSyncId = options.id || new Date().getTime().toString();

      let completedTasks = 0;
      const onTaskCompletedFactory =
        (taskType: PhotosSyncTaskType) => (photo: photos.Photo, info: PhotosTaskCompletedInfo) => {
          completedTasks++;
          options.onTaskCompleted?.({ taskType, photo, completedTasks, info });
        };

      this.logService.info(`[SYNC-MAIN] ${this.currentSyncId}: STARTED`);

      if (!this.model.user) {
        throw new Error('photos user not initialized');
      }

      if (!this.model.device) {
        throw new Error('photos device not initialized');
      }

      await this.deviceService.initialize();
      await this.localDatabaseService.cleanTmpCameraRollTable();

      const newestDate = await this.localDatabaseService.getNewestDate();
      const aDayBeforeNewestDate = moment(newestDate).subtract(1, 'day').toDate();
      const oldestDate = await this.localDatabaseService.getOldestDate();
      const aDayAfterOldestDate = moment(oldestDate).add(1, 'day').toDate();
      const syncInfo = await this.calculateSyncInfo();

      if (!options.signal?.aborted) {
        options.onStart?.(syncInfo);

        await this.downloadRemotePhotos({
          signal: options.signal,
          onPhotoDownloaded: onTaskCompletedFactory(PhotosSyncTaskType.Download),
        });
        this.logService.info(`[SYNC] ${this.currentSyncId}: REMOTE PHOTOS DOWNLOADED`);

        await this.uploadLocalPhotos(this.model.user.id, this.model.device.id, {
          ...options,
          from: aDayBeforeNewestDate,
          onPhotoUploaded: onTaskCompletedFactory(PhotosSyncTaskType.Upload),
        });
        this.logService.info(`[SYNC] ${this.currentSyncId}: NEWER LOCAL PHOTOS UPLOADED`);

        if (!oldestDate) {
          this.logService.info(`[SYNC] ${this.currentSyncId}: SKIPPED OLDER LOCAL PHOTOS UPLOAD`);
        } else {
          await this.uploadLocalPhotos(this.model.user.id, this.model.device.id, {
            ...options,
            to: aDayAfterOldestDate,
            onPhotoUploaded: onTaskCompletedFactory(PhotosSyncTaskType.Upload),
          });
          this.logService.info(`[SYNC] ${this.currentSyncId}: OLDER LOCAL PHOTOS UPLOADED`);
        }
      }

      if (options.signal?.aborted) {
        this.eventEmitter.emit(PhotosEventKey.CancelSyncEnd);
        this.logService.info(`[SYNC] ${this.currentSyncId}: ABORTED`);
      } else {
        this.logService.info(`[SYNC] ${this.currentSyncId}: FINISHED`);
      }
    } catch (err) {
      this.logService.error(`[SYNC] ${this.currentSyncId}: FAILED:` + JSON.stringify(err, undefined, 2));
      throw err;
    } finally {
      await this.localDatabaseService.cleanTmpCameraRollTable();
      await this.fileSystemService.clearTmp();

      this.logService.info(`[SYNC] ${this.currentSyncId}: FINALLY CLEANED TMP DATA FROM FS AND SQLITE`);
    }
  }

  private async calculateSyncInfo(): Promise<PhotosSyncInfo> {
    const initialTime = new Date().getTime();
    const remoteSyncAt = await this.localDatabaseService.getRemoteSyncAt();
    const newestDate = await this.localDatabaseService.getNewestDate();
    const aDayBeforeNewestDate = moment(newestDate).subtract(1, 'day').toDate();
    const oldestDate = await this.localDatabaseService.getOldestDate();
    const aDayAfterOldestDate = oldestDate && moment(oldestDate).add(1, 'day').toDate();
    const { count: downloadTasks } = await this.photosSdk.photos.getPhotos({
      statusChangedAt: remoteSyncAt,
      status: PhotoStatus.Exists,
    });
    const newerUploadTasks = await this.cameraRollService.count({ from: aDayBeforeNewestDate });
    const olderUploadTasks = aDayAfterOldestDate ? await this.cameraRollService.count({ to: aDayAfterOldestDate }) : 0;
    const syncInfo = {
      totalTasks: downloadTasks + newerUploadTasks + olderUploadTasks,
      downloadTasks,
      newerUploadTasks,
      olderUploadTasks,
    };
    const elapsedTime = (new Date().getTime() - initialTime) * 0.001;

    this.logService.info(
      `[SYNC] ${this.currentSyncId}: CALCULATED ${syncInfo.totalTasks} TASKS: ${
        syncInfo.downloadTasks
      } downloadTasks, ${syncInfo.newerUploadTasks} newerUploadTasks, ${
        syncInfo.olderUploadTasks
      } olderUploadTasks IN ${elapsedTime.toFixed(2)}s`,
    );

    return syncInfo;
  }

  /**
   * @description Downloads remote photos whose status changed after the last update
   */
  private async downloadRemotePhotos(options: {
    signal?: AbortSignal;
    onPhotoDownloaded: (photo: photos.Photo, info: PhotosTaskCompletedInfo) => void;
  }): Promise<void> {
    const remoteSyncAt = await this.localDatabaseService.getRemoteSyncAt();
    const now = new Date();
    const limit = 25;
    let skip = 0;
    let photos;

    this.logService.info(`[SYNC] ${this.currentSyncId}: LAST SYNC WAS AT ${remoteSyncAt.toUTCString()}`);

    do {
      const { results } = await this.photosSdk.photos.getPhotos({ statusChangedAt: remoteSyncAt }, skip, limit);

      photos = results;

      for (const photo of photos) {
        // * Stops execution if sync was aborted
        if (options.signal?.aborted) {
          return;
        }

        const photoInDevice = await this.localDatabaseService.getPhotoById(photo.id);
        const isAlreadyOnTheDevice = !!photoInDevice;
        let previewPath;

        this.logService.info('Photo ' + photo.name + ' is on the device? ' + isAlreadyOnTheDevice);

        if (isAlreadyOnTheDevice) {
          previewPath = photoInDevice ? photoInDevice.preview_path : '';
          await this.localDatabaseService.updatePhotoStatusById(photo.id, photo.status);
        } else {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const previewId = photo.previews && photo.previews.length > 0 ? photo.previews[0].fileId : photo.previewId;
          previewPath = await this.downloadService.pullPhoto(previewId, {
            toPath: `${this.fileSystemService.previewsDirectory}/${previewId}`,
            downloadProgressCallback: () => undefined,
            decryptionProgressCallback: () => undefined,
          });
          await this.localDatabaseService.insertPhoto({ ...photo, previewId }, previewPath);
        }

        options.onPhotoDownloaded(photo, { isAlreadyOnTheDevice, previewPath });
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
  private async uploadLocalPhotos(
    userId: photos.UserId,
    deviceId: photos.DeviceId,
    options: {
      signal?: AbortSignal;
      from?: Date;
      to?: Date;
      getState: () => RootState;
      onTaskSkipped?: () => void;
      onStorageLimitReached: () => void;
      onPhotoUploaded: (photo: photos.Photo, info: PhotosTaskCompletedInfo) => void;
    },
  ): Promise<void> {
    const limit = 50;
    let photosToUpload: { data: Omit<photos.CreatePhotoData, 'fileId' | 'previewId' | 'hash'>; uri: string }[];
    let cursor;
    let hasNextPage = false;

    this.logService.info(`[SYNC] ${this.currentSyncId}: UPLOADING LOCAL PHOTOS FROM ${options.from} TO ${options.to}`);

    do {
      const { edges: cameraRollPhotos, page_info }: PhotosCameraRollGetPhotosResponse =
        await this.cameraRollService.getPhotos({
          from: options.from,
          to: options.to,
          limit,
          cursor,
        });

      photosToUpload = cameraRollPhotos.map<{
        data: Omit<photos.CreatePhotoData, 'fileId' | 'previewId' | 'hash'>;
        uri: string;
      }>((p) => {
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
      });

      for (const photo of photosToUpload) {
        // * Stops execution if sync was aborted
        if (options.signal?.aborted) {
          return;
        }

        const usage = options.getState().storage.usage + options.getState().photos.usage;
        const limit = options.getState().storage.limit;
        const uri = await this.cameraRollUriToFileSystemUri(photo.data, photo.uri);
        const hash = await RNFS.hash(uri, 'sha256');
        const isAlreadyUploaded = await this.localDatabaseService.getPhotoByNameTypeDeviceAndHash(
          photo.data.name,
          photo.data.type,
          photo.data.deviceId,
          hash,
        );

        // * Avoids to upload the same photo multiple times
        if (isAlreadyUploaded) {
          this.logService.info(
            `[SYNC] ${this.currentSyncId}: ${items.getItemDisplayName(photo.data)} IS ALREADY UPLOADED, SKIPPING`,
          );
          options.onTaskSkipped?.();
        } else {
          if (photo.data.size + usage > limit) {
            options.onStorageLimitReached();
            throw new Error(strings.errors.storageLimitReached);
          }

          const [createdPhoto, previewPath] = await this.uploadService.upload({ ...photo.data, hash }, uri);

          await this.localDatabaseService.insertPhoto(createdPhoto, previewPath);

          options.onPhotoUploaded?.(createdPhoto, { isAlreadyOnTheDevice: false, previewPath });
        }
      }

      cursor = page_info.end_cursor;
      hasNextPage = page_info.has_next_page;
    } while (hasNextPage);
  }

  private async cameraRollUriToFileSystemUri(
    { name, type }: { name: string; type: string },
    uri: string,
  ): Promise<string> {
    const filename = items.getItemDisplayName({ name, type });
    const iosPath = `${this.fileSystemService.tmpDirectory}/${filename}`;
    let path = uri;

    if (Platform.OS === 'ios') {
      await RNFS.copyAssetsFileIOS(uri, iosPath, 0, 0);
      path = iosPath;
    }

    return path;
  }
}
