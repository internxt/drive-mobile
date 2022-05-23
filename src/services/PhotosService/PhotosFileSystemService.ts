import RNFS from 'react-native-fs';

import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import fileSystemService from '../FileSystemService';

export default class PhotosFileSystemService {
  private readonly model: PhotosServiceModel;
  private readonly logService: PhotosLogService;

  constructor(model: PhotosServiceModel, logService: PhotosLogService) {
    this.model = model;
    this.logService = logService;
  }

  public get tmpDirectory(): string {
    return `${fileSystemService.getDocumentsDir()}/tmp/photos`;
  }

  public get photosDirectory(): string {
    return `${this.rootDirectory}/photos`;
  }

  public get previewsDirectory(): string {
    return `${this.rootDirectory}/previews`;
  }

  private get rootDirectory(): string {
    return `${fileSystemService.getDocumentsDir()}/photos`;
  }

  public async initialize(): Promise<void> {
    await RNFS.mkdir(this.tmpDirectory);
    await RNFS.mkdir(this.photosDirectory);
    await RNFS.mkdir(this.previewsDirectory);
  }

  public async clear(): Promise<void> {
    await RNFS.unlink(this.tmpDirectory);
    await RNFS.unlink(this.rootDirectory);

    this.logService.info('Cleared file system data');
  }

  public async clearTmp(): Promise<void> {
    await RNFS.unlink(this.tmpDirectory);
    await RNFS.mkdir(this.tmpDirectory);
  }

  public async readDir(path: string): Promise<RNFS.ReadDirItem[]> {
    return RNFS.readDir(path);
  }
}
