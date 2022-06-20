import network from '../../network';
import { FileSystemRef } from '../../types';
import { PhotoFileSystemRef } from '../../types/photos';
import { PhotosCommonServices } from './PhotosCommonService';

export default class PhotosDownloadService {
  private readonly container: PhotosCommonServices = PhotosCommonServices.instance as PhotosCommonServices;

  public async download(
    fileId: string,
    options: {
      destination: FileSystemRef;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<PhotoFileSystemRef> {
    if (!PhotosCommonServices.model.user?.bucketId) {
      throw new Error('User bucket id not found');
    }

    if (!PhotosCommonServices.model.networkCredentials) {
      throw new Error('Network credentials not found');
    }

    await network.downloadFile(
      fileId,
      PhotosCommonServices.model.user.bucketId,
      PhotosCommonServices.model.networkCredentials.encryptionKey,
      {
        user: PhotosCommonServices.model.networkCredentials.user,
        pass: PhotosCommonServices.model.networkCredentials.password,
      },
      { toPath: options.destination, ...options },

      () => null,
    );

    return options.destination;
  }
}
