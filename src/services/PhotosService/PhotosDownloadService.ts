import network from '../../network';
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
    await network.downloadFile(
      fileId,
      this.model.user?.bucketId || '',
      this.model.networkCredentials.encryptionKey,
      {
        user: this.model.networkCredentials.user,
        pass: this.model.networkCredentials.password,
      },
      options,
      () => null,
    );

    return options.toPath;
  }
}
