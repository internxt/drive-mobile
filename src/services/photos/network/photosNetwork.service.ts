import { constants } from '@internxt-mobile/services/AppService';
import { SdkManager } from '@internxt-mobile/services/common';
import { FileSystemRef } from '@internxt-mobile/types/index';
import { PhotoFileSystemRef, PhotosItemBacked } from '@internxt-mobile/types/photos';
import { CreatePhotoData, Photo, PhotosSortBy } from '@internxt/sdk/dist/photos';
import { getEnvironmentConfig } from 'src/lib/network';
import network from 'src/network';
import { REMOTE_PHOTOS_PER_PAGE } from '../constants';
import { photosRealmDB } from '../database';
import { photosUser } from '../user';

export class PhotosNetworkService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getPhotos(fromDate?: Date): Promise<{ results: Photo[] }> {
    const limit = REMOTE_PHOTOS_PER_PAGE;
    const skip = 0;
    const { results } = await this.sdk.photos.photos.getPhotos(fromDate ? { updatedAt: fromDate } : {}, skip, limit);

    return { results };
  }

  public async getPhotosSorted(fromDate: Date): Promise<{ results: Photo[] }> {
    const limit = REMOTE_PHOTOS_PER_PAGE;
    const skip = 0;
    const { results } = await this.sdk.photos.photos.getPhotosSorted(
      {
        updatedAt: fromDate,
      },
      { sortBy: PhotosSortBy.UpdatedAt, sortType: 'ASC' },
      skip,
      limit,
      false,
    );

    return { results };
  }

  public async deletePhotos(photos: PhotosItemBacked[]): Promise<void> {
    await Promise.all(
      photos.map(async (photo) => {
        await this.sdk.photos.photos.deletePhotoById(photo.photoId);
        await photosRealmDB.deleteSyncedPhotosItem(photo.photoId);
      }),
    );
  }

  public async uploadPreview(previewRef: PhotoFileSystemRef) {
    const user = photosUser.getUser();
    if (!user) throw new Error('Photos user not found');
    const { bridgeUser, bridgePass, encryptionKey } = await getEnvironmentConfig();

    return network.uploadFile(
      previewRef,
      user.bucketId,
      encryptionKey,
      constants.PHOTOS_NETWORK_API_URL,
      {
        user: bridgeUser,
        pass: bridgePass,
      },
      {},
    );
  }

  public async upload(
    photoRef: PhotoFileSystemRef,
    data: Omit<CreatePhotoData, 'fileId' | 'networkBucketId'>,
    onProgressUpdate?: (progress: number) => void,
  ): Promise<Photo | null> {
    const user = photosUser.getUser();
    if (!user) throw new Error('Photos user not found');
    const { bridgeUser, bridgePass, encryptionKey } = await getEnvironmentConfig();

    const fileId = await network.uploadFile(
      photoRef,
      user.bucketId,
      encryptionKey,
      constants.PHOTOS_NETWORK_API_URL,
      {
        user: bridgeUser,
        pass: bridgePass,
      },
      {
        notifyProgress: onProgressUpdate,
      },
    );

    const createPhotoData: CreatePhotoData = {
      takenAt: data.takenAt,
      deviceId: data.deviceId,
      height: data.height,
      name: data.name,
      size: data.size,
      type: data.type,
      userId: data.userId,
      width: data.width,
      fileId,
      previewId: data.previewId,
      previews: data.previews,
      hash: data.hash,
      networkBucketId: user.bucketId,
      itemType: data.itemType,
      duration: data.duration,
    };

    return this.sdk.photos.photos.findOrCreatePhoto(createPhotoData);
  }

  public async download(
    fileId: string,
    options: {
      bucketId?: string;
      destination: FileSystemRef;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<PhotoFileSystemRef> {
    const user = photosUser.getUser();
    if (!user) throw new Error('Photos user not found');
    const { bridgeUser, bridgePass, encryptionKey } = await getEnvironmentConfig();

    await network.downloadFile(
      fileId,
      options.bucketId || user.bucketId,
      encryptionKey,
      {
        user: bridgeUser,
        pass: bridgePass,
      },
      { toPath: options.destination, ...options },

      () => null,
    );

    return options.destination;
  }
}

export const photosNetwork = new PhotosNetworkService(SdkManager.getInstance());
