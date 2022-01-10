import RNFS from 'react-native-fs';
import { request, items } from '@internxt/lib';
import axios, { AxiosRequestConfig } from 'axios';

import {
  NewPhoto,
  Photo,
  User,
  BucketId,
  NetworkCredentials,
  DeviceName,
  DeviceMac,
  Device,
  NewPhotoUploadedOnlyNetwork,
  PhotoStatus,
  Base64,
} from './types';
import { getDocumentsDir } from '../../lib/fs';
import * as network from '../network';
import sqliteService from '../sqlite';
import photoTable from '../sqlite/tables/photos';
import { PhotoId } from '@internxt/sdk/dist/photos';
import RNFetchBlob from 'rn-fetch-blob';

export async function generatePreview(filename: string, fileURI: string): Promise<string> {
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

export async function changePhotoStatus(photoId: PhotoId, status: PhotoStatus): Promise<void> {
  return sqliteService.updatePhotoStatusById(photoId, status);
}

export async function getLastUploadedLocalPhoto(): Promise<Photo | null> {
  // await sqliteService.executeSql('photos.db', photo.statements.)
  return null;
}

export async function getLastUpdateDate(): Promise<Date> {
  const lastUpdate: Date | null = await sqliteService.getMostRecentCreationDate();

  return lastUpdate ?? new Date('January 1, 1971 00:00:01');
}

export async function getLastPullFromRemoteDate(): Promise<Date> {
  const lastPullFromRemote: Date | null = await sqliteService.getMostRecentPullFromRemoteDate();

  return lastPullFromRemote ?? new Date('January 1, 1971 00:00:01');
}

export async function changeLastPullFromRemoteDate(newDate: Date): Promise<void> {
  await sqliteService.updateLastPullFromRemoteDate(newDate);
}

export async function pullPhoto(
  photosBucket: BucketId,
  networkCredentials: NetworkCredentials,
  photo: Photo,
): Promise<Base64> {
  const previewPath = await network.downloadFile(
    photosBucket,
    photo.previewId,
    networkCredentials,
    process.env.REACT_NATIVE_PHOTOS_NETWORK_API_URL!,
    {
      toPath: getDocumentsDir() + '/' + photo.previewId,
      downloadProgressCallback: (progress) => {
        // TODO
      },
      decryptionProgressCallback: (progress) => {
        // TODO
      },
    }
  );
  const preview = await RNFetchBlob.fs.readFile(previewPath, 'base64');

  await removeFile(previewPath);

  return preview;
}

export async function copyPhotoToDocumentsDir(
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

async function removeFile(path: string) {
  return RNFS.unlink(path);
}

export async function pushPhoto(
  photosBucket: BucketId,
  credentials: NetworkCredentials,
  photo: NewPhoto,
  options: AxiosRequestConfig,
): Promise<[Photo, Base64]> {
  const photoPath = await copyPhotoToDocumentsDir(photo.name, photo.width, photo.height, photo.URI);
  const previewPath = await generatePreview(photo.name, photo.URI);

  console.log('Uploading preview for photo ' + photo.name);
  const previewId = await network.uploadFile(
    previewPath,
    photosBucket,
    process.env.REACT_NATIVE_PHOTOS_NETWORK_API_URL!,
    credentials
  );

  console.log('Uploading photo for photo ' + photo.name);
  const fileId = await network.uploadFile(
    photoPath,
    photosBucket,
    process.env.REACT_NATIVE_PHOTOS_NETWORK_API_URL!,
    credentials
  );
  const preview = await RNFetchBlob.fs.readFile(previewPath, 'base64');

  await removeFile(previewPath);
  await removeFile(photoPath);

  const createdPhoto = await storePhotoRemotelly(
    {
      creationDate: photo.creationDate,
      deviceId: photo.deviceId,
      height: photo.height,
      // TODO: Encrypt name
      name: photo.name,
      size: photo.size,
      type: photo.type,
      userId: photo.userId,
      width: photo.width,
      fileId,
      previewId,
    },
    options,
  );

  return [createdPhoto, preview];
}

export async function destroyRemotePhoto(
  photosBucket: BucketId,
  credentials: NetworkCredentials,
  photo: Photo,
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

export async function storePhotoLocally(photo: Photo, preview: Base64): Promise<void> {
  sqliteService.executeSql('photos.db', photoTable.statements.insert, [
    photo.id,
    photo.name,
    photo.type,
    photo.size,
    photo.width,
    photo.height,
    photo.status,
    photo.fileId,
    photo.previewId,
    photo.deviceId,
    photo.userId,
    photo.creationDate,
    photo.lastStatusChangeAt,
    preview,
  ]);
}

export async function storePhotoRemotelly(
  photo: NewPhotoUploadedOnlyNetwork,
  options: AxiosRequestConfig,
): Promise<Photo> {
  const baseUrl = 'http://localhost:8001';

  return axios
    .post<Photo>(`${baseUrl}/photos`, photo, options)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

export async function getLocalPhotoById(photoId: PhotoId): Promise<Photo | null> {
  return sqliteService.getPhotoById(photoId);
}

export async function getRemotePhotosSince(
  date: Date,
  limit: number,
  skip: number,
  options: AxiosRequestConfig,
): Promise<Photo[]> {
  const baseUrl = 'http://localhost:8001';

  return axios
    .get(`${baseUrl}/photos?from=${date}&limit=${limit}&skip=${skip}`, options)
    .then<Photo[]>((res) => res.data)
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

interface InitPhotosUserPayload {
  name: DeviceName;
  mac: DeviceMac;
}

export async function initPhotosUser(payload: InitPhotosUserPayload, options: AxiosRequestConfig): Promise<User> {
  const baseUrl = 'http://localhost:8001';

  return axios
    .post<User>(`${baseUrl}/users`, payload, options)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}

interface CreateDevicePayload {
  mac: DeviceMac;
  name: DeviceName;
  userId: string;
}

export async function createDevice(payload: CreateDevicePayload, options: AxiosRequestConfig): Promise<Device> {
  const baseUrl = 'http://localhost:8001';

  return axios
    .post<Device>(`${baseUrl}/devices`, payload, options)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      throw new Error(request.extractMessageFromError(err));
    });
}