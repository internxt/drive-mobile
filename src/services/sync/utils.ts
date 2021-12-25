import RNFS from 'react-native-fs';
import { request } from '@internxt/lib';
import axios, { AxiosRequestConfig } from 'axios';

import { NewPhoto, Photo, PhotosUserId, BucketId, NetworkCredentials } from './types';
import { getDocumentsDir } from '../../lib/fs';
import * as network from '../network';

export async function generatePreview(filename: string, fileURI: string): Promise<string> {
  const previewURI = `${getDocumentsDir()}/${filename}-preview`;
  const previewWidth = 128;
  const previewHeight = 128;
  const scale = 0.5;

  // Store with enough quality to resize for different screens
  // TODO: What happens with Android??
  await RNFS.copyAssetsFileIOS(fileURI, previewURI, previewWidth, previewHeight, scale);

  return previewURI;
}

export async function changePhotoStatus(photo: Photo, status: 'EXISTS' | 'TRASH'): Promise<void> {
  // return updatePhotoById(photo.id, { status });
}

export async function getLastUploadedLocalPhoto(): Promise<Photo | null> {
  // return getPhotoWhere({});
  return null;
}

export async function getLastUpdateDate(): Promise<Date> {
  const lastPhoto = await getLastUploadedLocalPhoto();

  return lastPhoto ? lastPhoto.updatedAt : new Date('January 1, 1970 00:00:00');
}

export async function pullPhoto(
  photosBucket: BucketId,
  networkCredentials: NetworkCredentials,
  photo: Photo
): Promise<any> {
  const previewURI = await network.downloadFile(photosBucket, photo.previewId, networkCredentials);
  // 1. Get blob from previewURI (fetch(previewURI).then((res) => res.blob))
}

export async function pushPhoto(
  photosBucket: BucketId,
  credentials: NetworkCredentials,
  photo: NewPhoto
): Promise<void> {
  const previewURI = await generatePreview(photo.name, photo.URI);

  await network.uploadFile(previewURI, photosBucket, credentials);
  await network.uploadFile(photo.URI, photosBucket, credentials);

  // await storePhotoRemotelly(photo);
}

export async function destroyRemotePhoto(
  photosBucket: BucketId,
  credentials: NetworkCredentials,
  photo: Photo
): Promise<void> {
  await network.deleteFile(photo.previewId, photosBucket, credentials);
  await network.deleteFile(photo.fileId, photosBucket, credentials);

  // TODO: Call SDK here
  // await deleteRemotePhoto(photo.id);
}

export async function destroyLocalPhoto(photoId: string): Promise<void> {
  // TODO 
  return Promise.resolve();
}

export async function storePhotoLocally(photo: Photo, previewBlob: Blob): Promise<void> {
  // TODO
  return Promise.resolve();
}

export async function storePhotoRemotelly(photo: Photo): Promise<void> {
  // TODO
  return Promise.resolve();
}

export async function getPhotoById(photoId: string): Promise<Photo | null> {
  // TODO
  return Promise.resolve(null);
}

export async function getRemotePhotosSince(
  date: Date,
  limit: number,
  skip: number,
  options: AxiosRequestConfig
): Promise<Photo[]> {
  const baseUrl = 'http://localhost:8001';

  return axios.get(`${baseUrl}/photos?from=${date}&limit=${limit}&skip=${skip}`, options)
    .then<Photo[]>((res) => res.data)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

type DeviceName = string;
type DeviceMac = string;

interface InitPhotosUserPayload {
  name: DeviceName,
  mac: DeviceMac
}

export async function initPhotosUser(payload: InitPhotosUserPayload, options: AxiosRequestConfig): Promise<PhotosUserId> {
  const baseUrl = 'http://localhost:8001';

  return axios.post<{ id: PhotosUserId }>(`${baseUrl}/users`, payload, options).then((res) => {
    return res.data.id;
  }).catch((err) => {
    throw new Error(request.extractMessageFromError(err));
  });
}
