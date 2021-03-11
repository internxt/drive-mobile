import { mapSeries } from 'async';
import { ImageResult, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset, getAssetInfoAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs';
import { deviceStorage } from '../../helpers';
import SimpleToast from 'react-native-simple-toast';
import { getHeaders } from '../../helpers/headers';
import { IApiPhotoWithPreview, IApiPreview } from '../../types/api/photos/IApiPhoto';

export interface IHashedPhoto extends Asset {
  hash: string,
  localUri: string | undefined
  isSynced?: boolean
  isUploaded?: boolean
}

const getArrayPhotos = async (images: Asset[]) => {
  // TODO: Revisar async/next
  const result: Promise<IHashedPhoto[]> = mapSeries(images, async (image, next) => {
    const asset = await getAssetInfoAsync(image)

    if (!asset.localUri) {
      return next(Error('Missing localUri'));
    }

    const sha256Id = await RNFS.hash(asset.localUri, 'sha256')

    const hashedImage = {
      ...image,
      hash: sha256Id,
      localUri: asset.localUri
    }

    next(null, hashedImage)
  });

  return result;
}

export async function syncPhotos(images: IHashedPhoto[]): Promise<any> {
  // Skip uploaded photos with previews
  const alreadyUploadedPhotos = await getUploadedPhotos();
  const withPreviews = alreadyUploadedPhotos.filter(x => !!x.preview);
  const uploadedHashes = withPreviews.map(x => x.hash);
  const imagesToUpload = images.filter(x => uploadedHashes.indexOf(x.hash) < 0)

  // Upload filtered photos
  return mapSeries(imagesToUpload, (image, next) => {
    uploadPhoto(image).then(() => next(null)).catch(next)
  })
}

async function uploadPhoto(photo: IHashedPhoto) {
  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')

  const headers = {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic,
    'Content-Type': 'multipart/form-data'
  };

  const parsedUri = photo.localUri.replace(/^file:\/\//, '');

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(parsedUri)) : RNFetchBlob.wrap(photo.uri)

  return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photo/upload`, headers,
    [
      { name: 'xfile', filename: photo.filename, data: finalUri },
      { name: 'hash', data: photo.hash }
    ])
    .then((res) => {
      const statusCode = res.respInfo.status;

      if (statusCode === 401) { throw res; }
      if (statusCode === 201 || statusCode === 409) { return res.json(); }
      throw res
    })
    .then(async res => {

      if (!res.id) {
        return;
      }
      // Create photo preview and store on device
      const prev = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 220 } }],
        { compress: 1, format: SaveFormat.JPEG }
      )

      return uploadPreview(prev, res.id, photo);
    })
}

const uploadPreview = async (preview: ImageResult, photoId: number, originalPhoto: IHashedPhoto) => {
  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')
  const headers = {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic,
    'Content-Type': 'multipart/form-data'
  };

  const parsedUri = preview.uri.replace(/^file:\/\//, '');

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(parsedUri)) : RNFetchBlob.wrap(preview.uri)

  return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/preview/upload/${photoId}`,
    headers,
    [
      { name: 'xfile', filename: originalPhoto.filename, data: finalUri }
    ])
    .then(res => {
      const statusCode = res.respInfo.status;

      if (statusCode === 201 || statusCode === 409) {
        return res.json();
      }

      throw res;
    })
}

interface LocalImages {
  endCursor: string | undefined
  assets: IHashedPhoto[]
  hasNextPage: boolean
}

export function getLocalImages(after?: string | undefined): Promise<LocalImages> {
  const result: LocalImages = {
    endCursor: undefined,
    assets: [],
    hasNextPage: false
  };

  return Permissions.askAsync(Permissions.MEDIA_LIBRARY).then(() => {
    return MediaLibrary.getAssetsAsync({ first: 20, after: after });
  }).then((res) => {
    result.hasNextPage = res.hasNextPage;
    result.endCursor = res.endCursor;

    return getArrayPhotos(res.assets)
  }).then(res => {
    result.assets = res
    return result;
  });
}

export async function getUploadedPhotos(): Promise<IApiPhotoWithPreview[]> {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photos`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status !== 200) { throw res; }
    return res.json();
  })
}

export async function getUploadedPreviews(): Promise<IApiPreview[]> {
  return getUploadedPhotos().then(uploadedPhotos => {
    return uploadedPhotos.map((x) => x.preview);
  })
}

export async function getLocalPreviewsDir(): Promise<string> {
  const TempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.PictureDir) + '/drive-photos-previews';
  const TempDirExists = await RNFetchBlob.fs.exists(TempDir);

  if (!TempDirExists) {
    RNFS.mkdir(TempDir)
  }

  return TempDir;
}

export async function getLocalViewerDir(): Promise<string> {
  const TempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.CacheDir) + '/drive-photos-fileviewer';
  const TempDirExists = await RNFetchBlob.fs.exists(TempDir);

  if (!TempDirExists) {
    RNFS.mkdir(TempDir)
  }

  return TempDir;
}

export async function cachePicture(item: MediaLibrary.AssetInfo): Promise<string> {
  const tempPath = await getLocalViewerDir()

  const tempFile = tempPath + '/' + item.filename;

  const fileExists = await RNFS.exists(tempFile)

  if (!fileExists && item.localUri) {
    await RNFS.copyFile(item.localUri, tempFile)
  }

  return tempFile;
}

export async function getLocalPhotosDir(): Promise<string> {
  const TempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.PictureDir) + '/drive-photos';
  const TempDirExists = await RNFetchBlob.fs.exists(TempDir);

  if (!TempDirExists) {
    RNFS.mkdir(TempDir)
  }

  return TempDir;
}

export async function downloadPhoto(photo: any) {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const type = photo.type.toLowerCase()

  const tempDir = await getLocalPhotosDir();

  return RNFetchBlob.config({
    path: `${tempDir}/${photo.photoId}.${type}`,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/download/photo/${photo.id}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then((res) => {
    if (res.respInfo.status !== 200) {
      throw Error('Unable to download picture')
    }
    return res;
  }).then(res => MediaLibrary.saveToLibraryAsync(res.path())).then(() => {
    SimpleToast.show('Image downloaded!', 0.3)
  })
}

export async function downloadPreview(preview: any, photo: IApiPhotoWithPreview): Promise<void> {
  if (!preview) {
    return Promise.resolve();
  }
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const typePreview = preview.type
  const name = preview.fileId

  const tempDir = await getLocalPreviewsDir()
  const tempPath = tempDir + '/' + name + '.' + typePreview

  const previewExists = await RNFS.exists(tempPath);

  if (previewExists) {
    const localPreview = await RNFS.stat(tempPath);

    photo.localUri = localPreview.path;
    return Promise.resolve();
  }

  return RNFetchBlob.config({
    path: tempPath,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then(() => { return; }).catch(err => {
    RNFS.unlink(tempPath)
    throw err;
  })
}

async function getArrayPreviews(): Promise<IApiPreview[]> {
  const headers = await getHeaders();

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/previews`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status !== 200) { throw res; }
    return res.json();
  });
}

let SHOULD_STOP = false;

export function stopSync(): void {
  SHOULD_STOP = true;
}

export function getPreviews(): Promise<any> {
  SHOULD_STOP = false;
  return getUploadedPhotos().then((res) => {
    return mapSeries(res, (photo, next) => {
      if (SHOULD_STOP) {
        throw Error('Sign out')
      }

      return downloadPreview(photo.preview, photo).then(() => {
        next(null, photo)
      }).catch(err => {
      });
    });
  });
}

async function initializePhotosUser(): Promise<any> {
  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/initialize`, {
    method: 'GET',
    headers: await getHeaders(xToken || '', xUserJson.mnemonic)
  }).then(res => res.json())
}

async function photosUserData(): Promise<any> {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/user`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status !== 200) {
      throw Error();
    }
    return res.json()
  })
}

async function isUserInitialized() {
  return photosUserData()
    .then((res) => {
      if (!res.rootPreviewId || !res.rootAlbumId) {
        return false;
      }
      return true;
    })
    .catch(() => false);
}

export async function initUser(): Promise<void> {

  const xPhotos = await deviceStorage.getItem('xPhotos');

  if (xPhotos) {
    return;
  }

  const isInitialized = await isUserInitialized()

  if (!isInitialized) {
    await initializePhotosUser()
  }

  const infoUserPhoto = await photosUserData();

  await deviceStorage.saveItem('xPhotos', JSON.stringify(infoUserPhoto))
}