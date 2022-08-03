import { Photo, CreatePhotoData } from '@internxt/sdk/dist/photos';
import network from '../../../network';
import fileSystemService from '../../FileSystemService';
import { constants } from '../../AppService';
import { PhotosCommonServices } from '../PhotosCommonService';
import { PhotoFileSystemRef } from '../../../types/photos';
import { SdkManager } from 'src/services/common/SdkManager';

export default class PhotosUploadService {
  private sdk: SdkManager;
  constructor(sdk: SdkManager) {
    this.sdk = sdk;
  }
  public async uploadPreview(previewRef: PhotoFileSystemRef) {
    return network.uploadFile(
      previewRef,
      PhotosCommonServices.model.user?.bucketId || '',
      PhotosCommonServices.model.networkCredentials?.encryptionKey || '',
      constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
      {
        user: PhotosCommonServices.model.networkCredentials.user,
        pass: PhotosCommonServices.model.networkCredentials.password,
      },
      {},
    );
  }

  public async upload(photoRef: PhotoFileSystemRef, data: Omit<CreatePhotoData, 'fileId'>): Promise<Photo> {
    if (!PhotosCommonServices.model.user) throw new Error('Photos User not initialized');
    const fileId = await network.uploadFile(
      fileSystemService.uriToPath(photoRef),
      PhotosCommonServices.model.user.bucketId,
      PhotosCommonServices.model.networkCredentials.encryptionKey,
      constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
      {
        user: PhotosCommonServices.model.networkCredentials.user,
        pass: PhotosCommonServices.model.networkCredentials.password,
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
}
