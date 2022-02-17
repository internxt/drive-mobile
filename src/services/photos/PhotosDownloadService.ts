import { photos } from '@internxt/sdk';

import { NetworkCredentials } from '../../types';
import * as network from '../network';
import { getDocumentsDir } from '../fileSystem';
import PhotosLocalDatabaseService from './PhotosLocalDatabaseService';
import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import PhotosFileSystemService from './PhotosFileSystemService';

export default class PhotosDownloadService {
  private readonly model: PhotosServiceModel;
  private readonly localDatabaseService: PhotosLocalDatabaseService;
  private readonly logService: PhotosLogService;
  private readonly fileSystemService: PhotosFileSystemService;

  constructor(
    model: PhotosServiceModel,
    localDatabaseService: PhotosLocalDatabaseService,
    logService: PhotosLogService,
    fileSystemService: PhotosFileSystemService,
  ) {
    this.model = model;
    this.localDatabaseService = localDatabaseService;
    this.logService = logService;
    this.fileSystemService = fileSystemService;
  }

  public async downloadThumbnail(previewId: string): Promise<string> {
    const previewPath = await this.pullPhoto(
      this.model.user?.bucketId || '',
      this.model.networkCredentials,
      previewId,
      {
        toPath: `${this.fileSystemService.previewsDirectory}/${previewId}`,
        downloadProgressCallback: () => undefined,
        decryptionProgressCallback: () => undefined,
      },
    );

    return previewPath;
  }

  public async pullPhoto(
    photosBucket: string,
    networkCredentials: NetworkCredentials,
    fileId: string,
    options: {
      toPath: string;
      downloadProgressCallback: (progress: number) => void;
      decryptionProgressCallback: (progress: number) => void;
    },
  ): Promise<string> {
    const tmpPath = await network.downloadFile(photosBucket, fileId, networkCredentials, this.model.networkUrl, {
      ...options,
    });

    return tmpPath;
  }
}
