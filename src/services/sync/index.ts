import { DeviceId } from '@internxt/sdk';
import CameraRoll from '@react-native-community/cameraroll';

import { Photo, PhotosUserId, NewPhoto, BucketId, NetworkCredentials } from './types';
import { loadLocalPhotos } from '../photos';
import {
  changePhotoStatus,
  destroyLocalPhoto,
  destroyRemotePhoto,
  getLastUpdateDate,
  pullPhoto,
  pushPhoto,
  storePhotoLocally,
  getPhotoById,
  getRemotePhotosSince,
  initPhotosUser
} from './utils';

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
    const headers = new Headers();
    const jwt = '';
    headers.append('Authorization', `Bearer ${jwt}`);

    const remotePhotos: Photo[] = await getRemotePhotosSince(
      this.lastUpdate,
      this.opts.limit,
      this.opts.offset,
      { headers }
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

  private async ensurePhotosIsInitialized(): Promise<PhotosUserId> {
    // TODO: Check in local database
    const isPhotosInitialized = false;
    const headers = new Headers();
    const jwt = '';
    headers.append('Authorization', `Bearer ${jwt}`);

    return initPhotosUser({ mac: 'deviceMac', name: 'deviceName' }, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'internxt-network-pass': '',
        'internxt-network-user': ''
      }
    });
  }

  // private ensureLocalDBIsInitialized(): Promise<void> {
  //   // TODO: Check
  //   const isLocalDBInitialized = true;

  //   if (!isLocalDBInitialized) {
  //     await initializeLocalDB();
  //   }
  // }

  async start(): Promise<void> {
    await this.ensurePhotosIsInitialized();
    return;
    // await this.ensureLocalDBIsInitialized();
    // await this.uploadLocalPhotos();
    // await this.downloadRemotePhotos();
  }

  async uploadLocalPhotos(ofUser: PhotosUserId, inDevice: DeviceId): Promise<void> {
    const lastUpdate = await getLastUpdateDate();
    const limit = 20;
    const cursor = new LocalPhotosCursor(inDevice, ofUser, lastUpdate, { limit, offset: 0 });
    let photos: NewPhoto[];

    do {
      photos = await cursor.next();

      for (const photo of photos) {
        await pushPhoto(this.bucket, this.credentials, photo);
      }
    } while (photos.length === limit);
  }

  async downloadRemotePhotos(): Promise<void> {
    // TODO: Obtain from local database OR start from the beggining
    const lastUpdate = await getLastUpdateDate();
    const limit = 20;
    const cursor = new RemotePhotosCursor(lastUpdate, { limit, offset: 0 });
    let photos;

    do {
      photos = await cursor.next();

      for (const photo of photos) {
        if (photo.status === 'TRASH') {
          await this.movePhotoToTrash(photo);
        }

        if (photo.status === 'DELETED') {
          await this.removePhoto(photo);
        }

        if (photo.status === 'EXISTS') {
          await this.downloadPhoto(photo);
        }
      }
    } while (photos.length === limit);
  }

  private async downloadPhoto(photo: Photo): Promise<void> {
    const photoIsAlreadyOnTheDevice = !!(await getPhotoById(photo.id));;

    if (!photoIsAlreadyOnTheDevice) {
      // DOWNLOAD preview and store in local database
      const previewBlob = await pullPhoto(this.bucket, this.credentials, photo);
      await storePhotoLocally(photo, previewBlob);
    }
  }

  private async removePhoto(photo: Photo): Promise<void> {
    const photoIsAlreadyOnTheDevice = !!(await getPhotoById(photo.id));;

    if (photoIsAlreadyOnTheDevice) {
      await destroyRemotePhoto(this.bucket, this.credentials, photo);
      await destroyLocalPhoto(photo.id);
    }
  }

  private async movePhotoToTrash(photo: Photo): Promise<void> {
    const photoIsAlreadyOnTheDevice = !!(await getPhotoById(photo.id));

    if (photoIsAlreadyOnTheDevice) {
      await changePhotoStatus(photo, 'TRASH');
    } else {
      await pullPhoto(this.bucket, this.credentials, photo);
      // await storePhotoLocally(photo);
    }
  }
}

