import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import { Photo, Photos } from '@internxt/sdk/dist/photos';
import { items } from '@internxt/lib';

import * as network from '../network';
import { NewPhoto, PhotosServiceModel } from '../../types';
import { getDocumentsDir } from '../../lib/fs';

export default class PhotosUploadService {
  private readonly model: PhotosServiceModel;
  private readonly photosSdk: Photos;

  constructor(model: PhotosServiceModel, photosSdk: Photos) {
    this.model = model;
    this.photosSdk = photosSdk;
  }

  public async upload(photo: NewPhoto): Promise<[Photo, string]> {
    const photoPath = await this.copyPhotoToDocumentsDir(photo.name, photo.width, photo.height, photo.URI);
    const previewPath = await this.generatePreview(photo.name, photo.URI);

    console.log('Uploading preview for photo ' + photo.name);
    const previewId = await network.uploadFile(previewPath, this.model.bucket, this.model.networkCredentials);

    console.log('Uploading photo for photo ' + photo.name);
    const fileId = await network.uploadFile(photoPath, this.model.bucket, this.model.networkCredentials);
    const preview = await RNFetchBlob.fs.readFile(previewPath, 'base64');

    await RNFS.unlink(photoPath);
    await RNFS.unlink(previewPath);

    const createdPhoto = await this.photosSdk.photos.createPhoto({
      creationDate: photo.creationDate,
      deviceId: photo.deviceId,
      height: photo.height,
      name: photo.name, // TODO: Encrypt name
      size: photo.size,
      type: photo.type,
      userId: photo.userId,
      width: photo.width,
      fileId,
      previewId,
    });

    return [createdPhoto, preview];
  }

  private async copyPhotoToDocumentsDir(
    filename: string,
    width: number,
    height: number,
    photoURI: string,
  ): Promise<string> {
    const newPhotoURI = `${getDocumentsDir()}/${filename}`;
    const scale = 1;

    // TODO: What happens with Android??
    await RNFS.copyAssetsFileIOS(photoURI, newPhotoURI, width, height, scale);

    return newPhotoURI;
  }

  private async generatePreview(filename: string, fileURI: string): Promise<string> {
    const { filename: onlyFilename, extension } = items.getFilenameAndExt(filename);
    const previewPath = `${getDocumentsDir()}/${onlyFilename}-preview${extension ? '.' + extension : ''}`;
    const previewWidth = 128;
    const previewHeight = 128;
    const scale = 0.5;

    // Store with enough quality to resize for different screens
    // TODO: What happens with Android??
    await RNFS.copyAssetsFileIOS(fileURI, previewPath, previewWidth, previewHeight, scale);

    return previewPath;
  }
}
