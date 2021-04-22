import { mapSeries } from 'async';
import { ImageResult, manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset, getAssetInfoAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs';
import { deviceStorage } from '../../helpers';
import { getHeaders } from '../../helpers/headers';
import { IApiPhotoWithPreview, IApiPreview } from '../../types/api/photos/IApiPhoto';
import { PhotoActions } from '../../redux/actions';

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

    const hashedImage = {
      ...image,
      hash: '',
      localUri: asset.localUri
    }
    const binary = Platform.OS === 'ios'
      ? await RNFS.readFile(asset.localUri, 'base64').catch(() => { })
      : await RNFS.readFile(asset.uri, 'base64').catch(() => { })

    if (binary) {
      await sha256(binary).then(res => {
        hashedImage.hash = res
      })
    }

    next(null, hashedImage)
  });

  return result;
}

export async function syncPhotos(images: IHashedPhoto[], dispatch: any): Promise<any> {
  // Skip uploaded photos with previews
  const alreadyUploadedPhotos = await getUploadedPhotos();
  const withPreviews = alreadyUploadedPhotos.filter(x => !!x.preview);
  const uploadedHashes = withPreviews.map(x => x.hash);
  const imagesToUpload = images.filter(x => uploadedHashes.indexOf(x.hash) < 0)
  let last = false;
  let onePhotoToUpload = false;

  // Upload filtered photos
  return mapSeries(imagesToUpload, (image, next) => {
    if (!(imagesToUpload[imagesToUpload.length - 1] === imagesToUpload[0])) {
      if ((imagesToUpload[imagesToUpload.length - 1].id) === image.id) {
        last = true;
      }
    } else {
      onePhotoToUpload = true;
    }
    uploadPhoto(image, dispatch, last, onePhotoToUpload).then(() => next(null)).catch(next)
  })
}

async function uploadPhoto(photo: IHashedPhoto, dispatch: any, last: boolean, onePhotoToUpload: boolean) {

  if (!last || !onePhotoToUpload) {
    dispatch(PhotoActions.startSync())
  }

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

  let creationTime;

  if (Platform.OS === 'android') {
    creationTime = photo.modificationTime
  }
  if (Platform.OS === 'ios') {
    creationTime = photo.creationTime
  }
  if (creationTime) {
    creationTime = new Date(creationTime).toString()
  } else {
    creationTime = new Date().toString()
  }

  return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photo/upload`, headers,
    [
      { name: 'xfile', filename: photo.filename, data: finalUri },
      { name: 'hash', data: photo.hash },
      { name: 'creationTime', data: creationTime }

    ])
    .then((res) => {
      const statusCode = res.respInfo.status;

      if (statusCode === 401) {
        dispatch(PhotoActions.stopSync())
        throw res;
      }
      if (statusCode === 201) {
        return res.json();
      }
      if (statusCode === 409 || statusCode === 500) {
        dispatch(PhotoActions.stopSync())
      }
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

      return uploadPreview(prev, res.id, photo, dispatch, last, onePhotoToUpload);
    }).catch(err => { })
}

const uploadPreview = async (preview: ImageResult, photoId: number, originalPhoto: IHashedPhoto, dispatch: any, last: boolean, onePhotoToUpload: boolean) => {

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
      if (last || onePhotoToUpload) {
        dispatch(PhotoActions.stopSync())
      }
      const statusCode = res.respInfo.status;

      if (statusCode === 201 || statusCode === 409) {
        dispatch(PhotoActions.stopSync())
        return res.json();
      }

      throw res;
    })
}

export interface LocalImages {
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
    return MediaLibrary.getAssetsAsync({ first: 20, after: after, sortBy: [MediaLibrary.SortBy.modificationTime] });
  }).then((res) => {
    result.hasNextPage = res.hasNextPage;
    result.endCursor = res.endCursor;
    return getArrayPhotos(res.assets)
  }).then(res => {
    result.assets = res
    return result;
  });
}

export async function getPartialUploadedPhotos(matchImages: LocalImages): Promise<IApiPhotoWithPreview[]> {
  const headers = await getHeaders()

  const hashList = matchImages.assets.map(x => x.hash);

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photos/partial`, {
    method: 'POST',
    headers,
    body: JSON.stringify(hashList)
  }).then(res => {
    if (res.status !== 200) { throw res; }
    return res.json();
  }).catch(() => { })
}

export async function getPartialRemotePhotos(offset?= 0, limit?= 20) {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/remote/photos/${limit}/${offset}`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status !== 200) { throw res; }
    return res.json();
  })
}

export async function getUploadedPhotos(matchImages?: LocalImages): Promise<IApiPhotoWithPreview[]> {
  if (matchImages) {
    return getPartialUploadedPhotos(matchImages);
  }

  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photos`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status !== 200) { throw res; }
    return res.json();
  }).catch(() => { })
}

export async function getLocalPreviewsDir(): Promise<string> {
  const TempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.DocumentDir) + '/drive-photos-previews';
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
  const TempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.DocumentDir) + '/drive-photos';
  const TempDirExists = await RNFetchBlob.fs.exists(TempDir);

  if (!TempDirExists) {
    RNFS.mkdir(TempDir)
  }
  return TempDir;
}

export async function downloadPhoto(photo: any, setProgress: (progress: number) => void) {
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
  }).progress((received: number, total: number) => {
    setProgress(received / total)
  }).then((res) => {
    setProgress(0)
    if (res.respInfo.status !== 200) {
      throw Error('Unable to download picture')
    }
    return res;
  }).then(async (res) => {
    return MediaLibrary.saveToLibraryAsync(res.path())
  })
}

export async function downloadPreview(preview: any, photo: IApiPhotoWithPreview): Promise<any> {
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
    return Promise.resolve(photo.localUri);
  }

  return RNFetchBlob.config({
    path: tempPath,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then((res) => {
    return res.path();
  }).catch(err => {
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

export function getPreviews(push: any, offset?: number): Promise<any> {
  SHOULD_STOP = false;
  return getPartialRemotePhotos(offset).then((res) => {
    return mapSeries(res, (photo, next) => {
      if (SHOULD_STOP) {
        throw Error('Sign out')
      }

      return downloadPreview(photo.preview, photo).then((res) => {
        if (res) {
          const newPhoto = {
            ...photo,
            localUri: res
          }

          push(newPhoto)
        }
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