import { DeviceId } from '@internxt/sdk';
import CameraRoll from '@react-native-community/cameraroll';

import { Photo, NewPhoto, BucketId, NetworkCredentials, Device, User, UserId } from './types';
import { loadLocalPhotos } from '../photos';
import {
  changePhotoStatus,
  getLastUpdateDate,
  pullPhoto,
  pushPhoto,
  storePhotoLocally,
  getRemotePhotosSince,
  initPhotosUser,
  createDevice,
  getLocalPhotoById,
  getLastPullFromRemoteDate,
  changeLastPullFromRemoteDate
} from './utils';
import sqliteService from '../sqlite';


interface CursorOpts {
  limit: number
  offset: number
}

class RemotePhotosCursor {
  private opts: CursorOpts;
  private lastUpdate: Date;

  constructor(lastUpdate: Date, opts: CursorOpts) {
    this.opts = opts;
    this.lastUpdate = lastUpdate;
  }

  async next(): Promise<Photo[]> {
    const remotePhotos: Photo[] = await getRemotePhotosSince(
      this.lastUpdate,
      this.opts.limit,
      this.opts.offset,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      }
    );

    this.opts.offset += this.opts.limit;

    return remotePhotos;
  }
}

class LocalPhotosCursor {
  private opts: CursorOpts;
  private lastUpdate: Date;
  private userId: string;
  private deviceId: DeviceId;
  private cursor: string | undefined;

  constructor(deviceId: string, userId: string, lastUpdate: Date, opts: CursorOpts) {
    this.opts = opts;
    this.deviceId = deviceId;
    this.userId = userId;
    this.lastUpdate = lastUpdate;
  }

  private galleryPhotosToNewPhoto(galleryPhotos: CameraRoll.PhotoIdentifier[]): NewPhoto[] {
    const newPhotos: NewPhoto[] = [];

    for (const photo of galleryPhotos) {
      newPhotos.push({
        creationDate: new Date(photo.node.timestamp * 1000),
        userId: this.userId,
        deviceId: this.deviceId,
        height: photo.node.image.height,
        width: photo.node.image.width,
        // TODO: Check this
        size: photo.node.image.fileSize!,
        type: photo.node.type,
        URI: photo.node.image.uri,
        // TODO: Check this
        name: photo.node.image.filename!
      });
    }

    return newPhotos;
  }

  async next(): Promise<NewPhoto[]> {
    let photos: NewPhoto[] = [];

    const [galleryPhotos, cursor] = await loadLocalPhotos(
      this.lastUpdate,
      new Date(),
      this.opts.limit,
      this.cursor
    );

    photos = this.galleryPhotosToNewPhoto(galleryPhotos);

    this.opts.offset += this.opts.limit;
    this.cursor = cursor;

    return photos;
  }
}

export class PhotosSync {
  private bucket: BucketId;
  private credentials: NetworkCredentials;

  constructor(bucket: BucketId, credentials: NetworkCredentials) {
    this.bucket = bucket;
    this.credentials = credentials;
  }

  private async initializeUser(): Promise<User> {
    return initPhotosUser({ mac: 'deviceMac', name: 'deviceName' }, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'internxt-network-pass': this.credentials.pass,
        'internxt-network-user': this.credentials.user
      }
    });
  }

  private async initializeDevice(userId: string): Promise<Device> {
    return createDevice({
      mac: 'deviceMac',
      name: 'deviceName',
      userId
    }, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });
  }

  private async initializeLocalDb(): Promise<void> {
    await sqliteService.open('photos.db');
    await sqliteService.createPhotosTableIfNotExists();

    await sqliteService.createSyncDatesTableIfNotExists();

    const count = await sqliteService.getSyncDatesCount();
    const syncDatesNotInitialized = count === 0;
    if (syncDatesNotInitialized) {
      await sqliteService.initSyncDates();
      console.log('[SYNC-INITIALIZE]: SYNC DATES WAS EMPTY. INITIALIZED');
    }
  }

  async run(): Promise<void> {
    console.log('[SYNC-MAIN]: STARTED');

    // TODO: If first time, download all photos already uploaded because
    // the app could be reinstalled and the database is gone but the photos
    // are already uploaded
    await this.initializeLocalDb();
    console.log('[SYNC-MAIN]: LOCAL DB INITIALIZED');

    const user = await this.initializeUser();
    console.log('[SYNC-MAIN]: USER INITIALIZED');

    const device = await this.initializeDevice(user.id);
    console.log('[SYNC-MAIN]: DEVICE INITIALIZED');

    await this.downloadRemotePhotos();
    console.log('[SYNC-MAIN]: REMOTE PHOTOS DOWNLOADED');

    await this.uploadLocalPhotos(user.id, device.id);
    console.log('[SYNC-MAIN]: LOCAL PHOTOS UPLOADED');

    console.log('[SYNC-MAIN]: FINISHED');

    // Just for development purposes  
    // console.log('RESETING DB');
    // await sqliteService.resetDatabase();
    // console.log('DB RESETED');
  }

  async uploadLocalPhotos(ofUser: UserId, inDevice: DeviceId): Promise<void> {
    const lastUpdate = await getLastUpdateDate();
    const limit = 20;
    const cursor = new LocalPhotosCursor(inDevice, ofUser, lastUpdate, { limit, offset: 0 });
    let photos: NewPhoto[];

    console.log('[SYNC-LOCAL]: MOST RECENT PHOTO DATED AT', lastUpdate);

    let delta;

    do {
      photos = await cursor.next();

      for (const photo of photos) {
        delta = photo.creationDate.getTime() - lastUpdate.getTime();
        /**
         * WARNING: Camera roll does not filter properly by dates for photos with 
         * small deltas which can provoke the sync to re-update the last photo already
         * uploaded or photos that have very similar timestamp by miliseconds 
         * (like photos bursts)
         */
        console.log(`[SYNC-LOCAL]: UPLOADING ${photo.name} (DATE: ${photo.creationDate.toDateString()}, DELTA: ${delta})`);

        const alreadyExistentPhoto = await sqliteService.getPhotoByName(photo.name);

        if (alreadyExistentPhoto) {
          console.warn(`[SYNC-LOCAL]: ${photo.name} IS ALREADY UPLOADED, SKIPPING`);
          continue;
        }

        const [createdPhoto, previewBlob] = await pushPhoto(this.bucket, this.credentials, photo, {
          headers: {
            'Authorization': `Bearer ${jwt}`
          }
        });

        await storePhotoLocally(createdPhoto, previewBlob);
      }
    } while (photos.length === limit);
  }

  async downloadRemotePhotos(): Promise<void> {
    const lastUpdate = await getLastPullFromRemoteDate();
    const limit = 20;
    const cursor = new RemotePhotosCursor(lastUpdate, { limit, offset: 0 });
    let photos;

    const newPullFromRemoteDate = new Date();

    console.log('[SYNC-REMOTE]: LAST SYNC WAS AT', lastUpdate.toDateString());

    do {
      photos = await cursor.next();

      for (const photo of photos) {
        await this.downloadPhoto(photo);
      }
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
    await changeLastPullFromRemoteDate(newPullFromRemoteDate);
  }

  private async downloadPhoto(photo: Photo): Promise<void> {
    const photoIsOnTheDevice = !!(await getLocalPhotoById(photo.id));

    console.log('Photo ' + photo.name + ' is on the device? ' + photoIsOnTheDevice);

    if (photoIsOnTheDevice) {
      await changePhotoStatus(photo.id, photo.status);
    } else {
      const previewBlob = await pullPhoto(this.bucket, this.credentials, photo);
      await storePhotoLocally(photo, previewBlob);
    }
  }
}
