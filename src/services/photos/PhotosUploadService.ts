import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import { Photo, Photos, CreatePhotoData } from '@internxt/sdk/dist/photos';
import { items } from '@internxt/lib';

import * as network from '../network';
import { PhotosServiceModel } from '../../types';
import { getDocumentsDir } from '../../lib/fs';
import imageService from '../image';
import { Platform } from 'react-native';

export default class PhotosUploadService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;

  constructor(model: PhotosServiceModel, photosSdk: Photos) {
    this.model = model;
    this.photosSdk = photosSdk;
  }

  public async upload(data: Omit<CreatePhotoData, 'fileId' | 'previewId'>, uri: string): Promise<[Photo, string]> {
    const photoPath = await this.copyPhotoToDocumentsDir(data.name, data.width, data.height, uri);
    const previewPath = await this.generatePreview(data.name, uri);

    console.log('Uploading preview for photo ' + data.name);
    const previewId = await network.uploadFile(previewPath, this.model.bucket, this.model.networkCredentials);

    console.log('Uploading photo for photo ' + data.name);
    const fileId = await network.uploadFile(photoPath, this.model.bucket, this.model.networkCredentials);
    const preview = await RNFetchBlob.fs.readFile(previewPath, 'base64');

    await RNFS.unlink(photoPath);
    await RNFS.unlink(previewPath);

    const createdPhoto = await this.photosSdk.photos.createPhoto({
      creationDate: data.creationDate,
      deviceId: data.deviceId,
      height: data.height,
      name: data.name, // TODO: Encrypt name
      size: data.size,
      type: data.type,
      userId: data.userId,
      width: data.width,
      fileId,
      previewId,
    });

    return [createdPhoto, preview];
  }

  private async copyPhotoToDocumentsDir(filename: string, width: number, height: number, uri: string): Promise<string> {
    const path = `${getDocumentsDir()}/${filename}`;
    const scale = 1;

    if (Platform.OS === 'android') {
      throw new Error('(PhotosUploadService.copyPhotoToDocumentsDir) not implement on Android');
    } else {
      await RNFS.copyAssetsFileIOS(uri, path, width, height, scale);
    }

    return path;
  }

  private async generatePreview(filename: string, uri: string): Promise<string> {
    const { filename: onlyFilename, extension } = items.getFilenameAndExt(filename);
    const path = `${getDocumentsDir()}/${onlyFilename}-preview${extension ? '.' + extension : ''}`;
    const width = 128;
    const height = 128;

    const response = await imageService.resize({
      uri,
      width,
      height,
      format: 'JPEG',
      quality: 100,
      outputPath: path,
      rotation: 0,
      options: { mode: 'cover' },
    });
    // await RNFS.copyAssetsFileIOS(uri, path, width, height, scale);

    return response.path;
  }
}
