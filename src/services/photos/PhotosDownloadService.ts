import * as network from '../network';
import { PhotosServiceModel } from '../../types/photos';

export default class PhotosDownloadService {
  private readonly model: PhotosServiceModel;

  constructor(model: PhotosServiceModel) {
    this.model = model;
  }

  public async pullPhoto(
    fileId: string,
    options: {
      toPath: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<string> {
    const response = await network.downloadFile(
      this.model.user?.bucketId || '',
      fileId,
      this.model.networkCredentials,
      this.model.networkUrl,
      {
        ...options,
      },
    );

    return response.promise;
  }
}
