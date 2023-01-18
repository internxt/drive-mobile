import { BaseLogger } from '@internxt-mobile/services/common';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { Photo, PhotoStatus } from '@internxt/sdk/dist/photos';
import { Asset } from 'expo-media-library';
import Realm, { ObjectSchema } from 'realm';

// Store an alreay synced Photo
const PhotoSchema: ObjectSchema = {
  primaryKey: 'photoId',
  properties: {
    name: { type: 'string', indexed: true },
    photoId: { type: 'string', indexed: true },
    takenAt: 'date',
    hash: 'string',
    photoJSON: 'string',
    status: 'string',
  },
  name: 'Photo',
};

type PhotoDoc = {
  name: string;
  photoId: string;
  takenAt: Date;
  hash: string;
  status: PhotoStatus;
  photoJSON: string;
};

// Store a DevicePhoto
const DevicePhotoSchema: ObjectSchema = {
  primaryKey: 'name',
  properties: {
    name: { type: 'string', indexed: true },
    takenAt: 'date',
    devicePhotoJSON: 'string',
  },
  name: 'DevicePhoto',
};

type DevicePhotoDoc = {
  name: string;
  takenAt: Date;
  devicePhotoJSON: string;
};
export class PhotosRealmDB {
  private _realm: Realm | null = null;
  private logger: BaseLogger = new BaseLogger({
    tag: 'PHOTOS_REALM_DB',
    enabled: false,
  });

  async init() {
    this._realm = await Realm.open({
      schema: [PhotoSchema],
      deleteRealmIfMigrationNeeded: true,
    });

    this.logger.info('Photos Realm DB is ready');
  }

  clear() {
    if (!this._realm) return;
    this.realm.write(() => {
      this.realm.deleteAll();
    });

    fs.unlinkIfExists(this.realm.path);
  }

  private get realm() {
    if (!this._realm) throw new Error('No connection open, call init() first');

    return this._realm as Realm;
  }

  public async saveDevicePhotos(devicePhotos: Asset[]) {
    this.realm.write(() => {
      devicePhotos.forEach((devicePhoto) => {
        this.realm.create<DevicePhotoDoc>(
          DevicePhotoSchema.name,
          {
            name: devicePhoto.filename,
            devicePhotoJSON: JSON.stringify(devicePhoto),
            takenAt: new Date(devicePhoto.creationTime),
          },
          Realm.UpdateMode.All,
        );
      });
    });
  }

  public async savePhotosItem(photo: Photo, getQueryTime = false) {
    const start = Date.now();
    this.realm.write(() => {
      this.realm.create<PhotoDoc>(
        PhotoSchema.name,
        {
          photoId: photo.id,
          hash: photo.hash,
          takenAt: photo.takenAt,
          name: photo.name,
          photoJSON: JSON.stringify(photo),
          status: photo.status,
        },
        Realm.UpdateMode.All,
      );
    });

    if (getQueryTime) {
      this.logger.info(`Photos item saved into DB in ${Date.now() - start}ms`);
    } else {
      this.logger.info('Photos item saved into DB');
    }
  }

  public async getSyncedPhotoByNameAndDate(name: string, takenAt: number) {
    const docs = this.realm
      .objects<PhotoDoc>(PhotoSchema.name)
      .filtered('name == $0 AND takenAt == $1', name, new Date(takenAt));

    return this.parseFirst(docs);
  }

  public async getSyncedPhotosCount() {
    return this.realm.objects<PhotoDoc>(PhotoSchema.name).length;
  }

  public async getSyncedPhotoByName(name: string) {
    const docs = this.realm.objects<PhotoDoc>(PhotoSchema.name).filtered('name == $0', name);

    return this.parseFirst(docs);
  }

  public async getSyncedPhotoByHash(hash: string) {
    const docs = this.realm.objects<PhotoDoc>(PhotoSchema.name).filtered('hash == $0', hash);

    return this.parseFirst(docs);
  }

  public async deleteSyncedPhotosItem(photoId: string) {
    const docs = this.realm.objects<PhotoDoc>(PhotoSchema.name).filtered('photoId == $0', photoId);
    if (!docs[0]) return false;

    this.realm.write(() => {
      docs[0].status = PhotoStatus.Deleted;
    });

    return true;
  }

  public async getSyncedPhotos() {
    const docs = this.realm.objects<PhotoDoc>(PhotoSchema.name);

    return docs.map(this.parseObject);
  }

  private parseObject(object: Realm.Object) {
    const serialized = object.toJSON() as PhotoDoc;
    return JSON.parse(serialized.photoJSON) as Photo;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseFirst(objects: Realm.Results<any>) {
    if (!objects[0]) return null;
    return this.parseObject(objects[0]);
  }
}

export const photosRealmDB = new PhotosRealmDB();
