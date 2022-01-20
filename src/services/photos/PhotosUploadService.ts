import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import { Photo, Photos, CreatePhotoData } from '@internxt/sdk/dist/photos';
import { Platform } from 'react-native';

import * as network from '../network';
import { getDocumentsDir } from '../fileSystem';
import imageService from '../image';
import { PhotosServiceModel } from '../../types/photos';

export default class PhotosUploadService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;

  constructor(model: PhotosServiceModel, photosSdk: Photos) {
    this.model = model;
    this.photosSdk = photosSdk;
  }

  public async upload(data: Omit<CreatePhotoData, 'fileId' | 'previewId'>, uri: string): Promise<[Photo, string]> {
    const fullName = `${data.name}.${data.type}`;
    console.log('PhotosUploadService.upload - uri: ', uri);
    const photoPath = await this.copyPhotoToDocumentsDir(fullName, data.width, data.height, uri);
    const previewPath = await this.generatePreview(fullName, uri);

    console.log('PhotosUploadService - photoPath:', photoPath);
    console.log('PhotosUploadService - previewPath: ', previewPath);

    console.log('Uploading preview for photo ' + data.name);
    const previewId = await network.uploadFile(
      previewPath,
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    console.log('Uploading photo for photo ' + data.name);
    const fileId = await network.uploadFile(
      photoPath,
      this.model.user?.bucketId || '',
      this.model.networkUrl,
      this.model.networkCredentials,
    );

    const preview = await RNFetchBlob.fs.readFile(previewPath, 'base64');

    await RNFS.unlink(photoPath);
    await RNFS.unlink(previewPath);

    const createPhotoData: CreatePhotoData = {
      takenAt: data.takenAt,
      deviceId: data.deviceId,
      height: data.height,
      name: data.name, // TODO: Encrypt name
      size: data.size,
      type: data.type,
      userId: data.userId,
      width: data.width,
      fileId,
      previewId,
    };
    const createdPhoto = await this.photosSdk.photos.createPhoto(createPhotoData);

    return [createdPhoto, preview];
  }

  private async copyPhotoToDocumentsDir(filename: string, width: number, height: number, uri: string): Promise<string> {
    const path = `${getDocumentsDir()}/${filename}`;
    const scale = 1;

    if (Platform.OS === 'android') {
      await RNFS.copyFile(uri, path);
    } else {
      await RNFS.copyAssetsFileIOS(uri, path, width, height, scale);
    }

    return path;
  }

  private async generatePreview(filename: string, uri: string): Promise<string> {
    const path = `${getDocumentsDir()}/${filename}`;
    const width = 128;
    const height = 128;

    const response = await imageService.resize({
      uri,
      width,
      height,
      format: 'JPEG',
      outputPath: Platform.OS === 'android' ? undefined : path,
      quality: 100,
      rotation: 0,
      options: { mode: 'cover' },
    });

    return response.path;
  }
}
