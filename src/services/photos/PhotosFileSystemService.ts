import RNFS from 'react-native-fs';

import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import { getDocumentsDir } from '../fileSystem';

export default class PhotosFileSystemService {
  private readonly model: PhotosServiceModel;
  private readonly logService: PhotosLogService;

  constructor(model: PhotosServiceModel, logService: PhotosLogService) {
    this.model = model;
    this.logService = logService;
  }

  public async initialize(): Promise<void> {
    await RNFS.mkdir(this.photosDirectory);
    await RNFS.mkdir(this.previewsDirectory);
  }

  public get photosDirectory(): string {
    return `${this.rootDirectory}/photos`;
  }

  public get previewsDirectory(): string {
    return `${this.rootDirectory}/previews`;
  }

  public async clear(): Promise<void> {
    await RNFS.unlink(this.rootDirectory);

    this.logService.info('Cleared file system data');
  }

  private get rootDirectory(): string {
    return `${getDocumentsDir()}/photos`;
  }
}
