import RNFS from 'react-native-fs';

import { PhotosServiceModel } from '../../types/photos';
import PhotosLogService from './PhotosLogService';
import { PHOTOS_DIRECTORY, PHOTOS_PREVIEWS_DIRECTORY, PHOTOS_ROOT_DIRECTORY, PHOTOS_TMP_DIRECTORY } from './constants';

export default class PhotosFileSystemService {
  private readonly model: PhotosServiceModel;
  private readonly logService: PhotosLogService;

  constructor(model: PhotosServiceModel, logService: PhotosLogService) {
    this.model = model;
    this.logService = logService;
  }

  public async initialize(): Promise<void> {
    await RNFS.mkdir(PHOTOS_TMP_DIRECTORY);
    await RNFS.mkdir(PHOTOS_DIRECTORY);
    await RNFS.mkdir(PHOTOS_PREVIEWS_DIRECTORY);
  }

  public async clear(): Promise<void> {
    await RNFS.unlink(PHOTOS_TMP_DIRECTORY);
    await RNFS.unlink(PHOTOS_ROOT_DIRECTORY);

    this.logService.info('Cleared file system data');
  }

  public async clearTmp(): Promise<void> {
    await RNFS.unlink(PHOTOS_TMP_DIRECTORY);
    await RNFS.mkdir(PHOTOS_TMP_DIRECTORY);
  }

  public async readDir(path: string): Promise<RNFS.ReadDirItem[]> {
    return RNFS.readDir(path);
  }
}
