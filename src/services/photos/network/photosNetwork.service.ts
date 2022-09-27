import { constants } from '@internxt-mobile/services/AppService';
import { SdkManager } from '@internxt-mobile/services/common';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { FileSystemRef } from '@internxt-mobile/types/index';
import { PhotoFileSystemRef } from '@internxt-mobile/types/photos';
import { CreatePhotoData, Photo, PhotoStatus } from '@internxt/sdk/dist/photos';
import { getEnvironmentConfig } from 'src/lib/network';
import network from 'src/network';
import { photosLocalDB } from '../database';

export class PhotosNetworkService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }

  public async getPhotos({
    limit = 50,
    skip = 0,
  }: {
    limit: number;
    skip?: number;
  }): Promise<{ results: Photo[]; count: number }> {
    const { results, count } = await this.sdk.photos.photos.getPhotos({ status: PhotoStatus.Exists }, skip, limit);

    return { results, count };
  }

  public async deletePhotos(photos: Photo[]): Promise<void> {
    await Promise.all(
      photos.map(async (photo) => {
        await this.sdk.photos.photos.deletePhotoById(photo.id);
        await photosLocalDB.deletePhotoById(photo.id);
      }),
    );
  }

  public async uploadPreview(previewRef: PhotoFileSystemRef) {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();

    return network.uploadFile(
      previewRef,
      bucketId,
      encryptionKey || '',
      constants.PHOTOS_NETWORK_API_URL,
      {
        user: bridgeUser,
        pass: bridgePass,
      },
      {},
    );
  }

  public async upload(photoRef: PhotoFileSystemRef, data: Omit<CreatePhotoData, 'fileId'>): Promise<Photo> {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();

    const fileId = await network.uploadFile(
      fileSystemService.uriToPath(photoRef),
      bucketId,
      encryptionKey,
      constants.PHOTOS_NETWORK_API_URL,
      {
        user: bridgeUser,
        pass: bridgePass,
      },
      {},
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
    };

    const createdPhoto = await this.sdk.photos.photos.createPhoto(createPhotoData);

    return createdPhoto;
  }

  public async download(
    fileId: string,
    options: {
      destination: FileSystemRef;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<PhotoFileSystemRef> {
    const { bridgeUser, bridgePass, encryptionKey, bucketId } = await getEnvironmentConfig();

    await network.downloadFile(
      fileId,
      bucketId,
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
