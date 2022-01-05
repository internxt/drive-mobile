import { photos } from '@internxt/sdk';
import { getMacAddress, getDeviceName } from 'react-native-device-info';

import { PhotosServiceModel } from '../../types';
import PhotosCameraRollService from './PhotosCameraRollService';
import PhotosDeleteService from './PhotosDeleteService';
import PhotosDownloadService from './PhotosDownloadService';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import PhotosUploadService from './PhotosUploadService';

export default class PhotosSyncService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: photos.Photos;

  private readonly cameraRollService: PhotosCameraRollService;
  private readonly uploadService: PhotosUploadService;
  private readonly downloadService: PhotosDownloadService;
  private readonly deleteService: PhotosDeleteService;
  private readonly localDatabaseService: PhotosLocalDatabaseService;

  constructor(
    model: PhotosServiceModel,
    photosSdk: photos.Photos,
    cameraRollService: PhotosCameraRollService,
    uploadService: PhotosUploadService,
    downloadService: PhotosDownloadService,
    deleteService: PhotosDeleteService,
    localDatabaseService: PhotosLocalDatabaseService,
  ) {
    this.model = model;
    this.photosSdk = photosSdk;
    this.cameraRollService = cameraRollService;
    this.uploadService = uploadService;
    this.downloadService = downloadService;
    this.deleteService = deleteService;
    this.localDatabaseService = localDatabaseService;
  }

  public async run(): Promise<void> {
    console.log('[SYNC-MAIN]: STARTED');

    // TODO: If first time, download all photos already uploaded because
    // the app could be reinstalled and the database is gone but the photos
    // are already uploaded

    const user = await this.initializeUser();
    this.model.bucket = user.bucketId;
    console.log('[SYNC-MAIN]: USER INITIALIZED');

    const device = await this.initializeDevice(user.id);
    console.log('[SYNC-MAIN]: DEVICE INITIALIZED');

    await this.downloadRemotePhotos();
    console.log('[SYNC-MAIN]: REMOTE PHOTOS DOWNLOADED');

    await this.uploadLocalPhotos(user.id, device.id);
    console.log('[SYNC-MAIN]: LOCAL PHOTOS UPLOADED');

    console.log('[SYNC-MAIN]: FINISHED');

    // console.log('RESETING DB');
    // await this.database.reset();
    // console.log('DB RESETED');
  }

  private async initializeUser(): Promise<photos.User> {
    const mac = await getMacAddress();
    const name = await getDeviceName();

    return this.photosSdk.users.initialize({
      mac,
      name,
      bridgeUser: this.model.networkCredentials.user,
      bridgePassword: this.model.networkCredentials.password,
    });
  }

  private async initializeDevice(userId: string): Promise<photos.Device> {
    const mac = await getMacAddress();
    const name = await getDeviceName();

    return this.photosSdk.devices.createDevice({ mac, name, userId });
  }

  private async downloadRemotePhotos(): Promise<void> {
    const lastUpdate =
      (await this.localDatabaseService.getMostRecentPullFromRemoteDate()) ?? new Date('January 1, 1971 00:00:01');
    const limit = 20;
    let offset = 0;
    let photos;

    const newPullFromRemoteDate = new Date();

    console.log('[SYNC-REMOTE]: LAST SYNC WAS AT', lastUpdate.toDateString());

    do {
      photos = await this.photosSdk.photos.getPhotosSince(lastUpdate, limit, offset);

      for (const photo of photos) {
        await this.downloadService.downloadPhoto(photo);
      }

      offset += limit;
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
    await this.localDatabaseService.updateLastPullFromRemoteDate(newPullFromRemoteDate);
  }

  async uploadLocalPhotos(userId: photos.UserId, deviceId: photos.DeviceId): Promise<void> {
    const lastUpdate =
      (await this.localDatabaseService.getMostRecentCreationDate()) ?? new Date('January 1, 1971 00:00:01');
    const limit = 20;
    let cursor: string | undefined;
    let photosToUpload: { data: Omit<photos.CreatePhotoData, 'fileId' | 'previewId'>; uri: string }[];
    let delta: number;

    console.log('[SYNC-LOCAL]: MOST RECENT PHOTO DATED AT', lastUpdate);

    do {
      const [galleryPhotos, nextCursor] = await this.cameraRollService.loadLocalPhotos(
        lastUpdate,
        new Date(),
        limit,
        cursor,
      );
      photosToUpload = galleryPhotos.map<{ data: Omit<photos.CreatePhotoData, 'fileId' | 'previewId'>; uri: string }>(
        (p) => ({
          data: {
            creationDate: new Date(p.node.timestamp * 1000),
            userId: userId,
            deviceId: deviceId,
            height: p.node.image.height,
            width: p.node.image.width,
            size: p.node.image.fileSize!,
            type: p.node.type,
            name: p.node.image.filename!,
          },
          uri: p.node.image.uri,
        }),
      );

      cursor = nextCursor;

      for (const photo of photosToUpload) {
        delta = photo.data.creationDate.getTime() - lastUpdate.getTime();
        /**
         * WARNING: Camera roll does not filter properly by dates for photos with
         * small deltas which can provoke the sync to re-update the last photo already
         * uploaded or photos that have very similar timestamp by miliseconds
         * (like photos bursts)
         */
        console.log(
          `[SYNC-LOCAL]: UPLOADING ${
            photo.data.name
          } (DATE: ${photo.data.creationDate.toDateString()}, DELTA: ${delta})`,
        );

        const alreadyExistentPhoto = await this.localDatabaseService.getPhotoByName(photo.data.name);

        if (alreadyExistentPhoto) {
          console.warn(`[SYNC-LOCAL]: ${photo.data.name} IS ALREADY UPLOADED, SKIPPING`);
          continue;
        }

        const [createdPhoto, preview] = await this.uploadService.upload(photo.data, photo.uri);

        await this.localDatabaseService.insertPhoto(createdPhoto, preview);
      }
    } while (photosToUpload.length === limit);
  }
}
