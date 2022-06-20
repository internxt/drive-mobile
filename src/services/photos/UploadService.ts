import { Photo, CreatePhotoData } from '@internxt/sdk/dist/photos';
import network from '../../network';
import fileSystemService from '../FileSystemService';
import { constants } from '../AppService';
import { PhotosCommonServices } from './PhotosCommonService';
import { PhotoFileSystemRef } from '../../types/photos';

export default class PhotosUploadService {
  public async uploadPreview(previewRef: PhotoFileSystemRef) {
    if (!PhotosCommonServices.model.user?.bucketId) {
      throw new Error('User bucket id not found');
    }

    if (!PhotosCommonServices.model.networkCredentials) {
      throw new Error('Network credentials not found');
    }
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
    if (!PhotosCommonServices.model.user?.bucketId) {
      throw new Error('User bucket id not found');
    }

    if (!PhotosCommonServices.model.networkCredentials) {
      throw new Error('Network credentials not found');
    }

    if (!PhotosCommonServices.sdk) {
      throw new Error('Photos sdk not initialized');
    }

    const fileId = await network.uploadFile(
      fileSystemService.uriToPath(photoRef),
      PhotosCommonServices.model.user?.bucketId,
      PhotosCommonServices.model.networkCredentials.encryptionKey,
      constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
      {
        user: PhotosCommonServices.model.networkCredentials.user,
        pass: PhotosCommonServices.model.networkCredentials.password,
      },
      {},
    );

    const hash = await PhotosCommonServices.getPhotoHash(
      PhotosCommonServices.model.user.id,
      data.name,
      data.takenAt.getTime(),
      photoRef,
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
      hash,
    };

    const createdPhoto = await PhotosCommonServices.sdk?.photos.createPhoto(createPhotoData);

    return createdPhoto;
  }
}
