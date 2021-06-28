import { mapSeries, queue } from 'async';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset, getAssetInfoAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs';
import { deviceStorage } from '../../helpers';
import { getHeaders } from '../../helpers/headers';
import { IAPIPhoto, IApiPhotoWithPreview, IApiPreview } from '../../types/api/photos/IApiPhoto';
import { checkExistsUriTrash, removeUrisFromUrisTrash, savePhotosAndPreviewsDB, saveUrisTrash, updateLocalUriPreviews } from '../../database/DBUtils.ts/utils';
import CameraRoll from '@react-native-community/cameraroll';
import PackageJson from '../../../package.json'
import { photoActions } from '../../redux/actions';
import _ from 'lodash';
import allSettled from 'promise.allsettled'

export interface IHashedPhoto extends Asset {
  hash: string,
  localUri: string | undefined
  isUploaded: boolean
  isLocal: boolean
  isUploading: boolean
  isDownloading: boolean
  photoId: number
}

interface IUploadedPhoto {
  photo: IAPIPhoto,
  preview: IApiPreview
}

const getArrayPhotos = async (images: Asset[]) => {
  // allSettled may cause high performance impact and memory crashes. Check on real devices
  const assets = await allSettled(images.map(async asset => {
    const photo = await getAssetInfoAsync(asset)

    return {
      ...photo,
      hash: await RNFS.hash(photo.localUri, 'sha256'),
      localUri: photo.localUri
    }
  }))

  return assets
    .filter(promiseRes => promiseRes.status === 'fulfilled')
    .map(fullfiledRes => fullfiledRes.value)
}

export async function syncPhotos(images: IHashedPhoto[], dispatch: any): Promise<void> {
  const photoQueue = queue(async (task: () => Promise<void>, callBack) => {
    await task()
    callBack()
  }, 5)

  images.forEach(image => photoQueue.push(() => uploadPhoto(image, dispatch)))
  return photoQueue.drain()
}

export const separatePhotos = (images: IHashedPhoto[], withPreviews: IApiPhotoWithPreview[], alreadyUploadedPhotos: IApiPhotoWithPreview[]) => {
  if (withPreviews.length === 0) {
    const difference = _.differenceBy([...images], [...alreadyUploadedPhotos], 'hash')

    return difference;
  } else {
    const uploadedHashes = withPreviews.map(x => x.hash);
    const photos = images.filter(x => uploadedHashes.indexOf(x.hash) < 0)
    const difference = _.differenceBy([...photos], [...alreadyUploadedPhotos], 'hash')

    return difference;
  }
}

export async function syncPreviews(imagesToUpload: any[], dispatch) {

  await mapSeries(imagesToUpload, (image, next) => {
    if (image === undefined) {
      return;
    }
    return uploadPreviewIfNull(image.photo.id, image, dispatch, image.photo).then(() => next(null)).catch((err) => next(null))
  })
}

const createCompressedPhoto = async (pathToPhoto: string) => {
  const preview = await manipulateAsync(pathToPhoto, [{ resize: { width: 220 } }],
    { compress: 0.8, format: SaveFormat.JPEG }
  )

  return preview
}
const uploadPhoto = async (photo: IHashedPhoto, dispatch: any) => {
  try {
    dispatch(photoActions.updatePhotoStatusUpload(photo.hash, false))
    const xUser = await deviceStorage.getItem('xUser')
    const xToken = await deviceStorage.getItem('xToken')
    const xUserJson = JSON.parse(xUser || '{}')
    const headers = {
      'Authorization': `Bearer ${xToken}`,
      'internxt-mnemonic': xUserJson.mnemonic,
      'Content-Type': 'multipart/form-data',
      'internxt-version': PackageJson.version,
      'internxt-client': 'drive-mobile'
    }

    const preview = await createCompressedPhoto(photo.uri)
    const parsedUri = photo.localUri.replace(/^file:\/\//, '')
    let uriPhoto, uriPreview, creationTime

    if (Platform.OS === 'ios') {
      const parsedUriPreview = preview.uri.replace(/^file:\/\//, '')

      uriPhoto = RNFetchBlob.wrap(parsedUri)
      uriPreview = RNFetchBlob.wrap(decodeURIComponent(parsedUriPreview))
      creationTime = photo.creationTime
    } else {
      uriPhoto = RNFetchBlob.wrap(photo.uri)
      uriPreview = RNFetchBlob.wrap(preview.uri)
      creationTime = photo.modificationTime
    }
    creationTime = creationTime ? new Date(creationTime).toString() : new Date().toString()

    const fetchResponse = await RNFetchBlob.config({
      timeout: 300000
    })
      .fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photo/preview/upload`,
        headers,
        [
          { name: 'xfiles', filename: photo.filename, data: uriPhoto },
          { name: 'xfiles', filename: `preview-${photo.filename}`, data: uriPreview },
          { name: 'hash', data: photo.hash },
          { name: 'creationTime', data: creationTime }
        ])
    const status = fetchResponse.respInfo.status

    if (status !== 201 && status !== 409) {
      throw new Error('Server error status response: ' + status)
    }
    const uploadedPhoto: IUploadedPhoto = await fetchResponse.json()

    if (!uploadedPhoto.photo.id) {
      throw new Error('Photo without id')
    }
    const finalPhoto = {
      ...uploadedPhoto.photo,
      preview: uploadedPhoto.preview
    }

    await savePhotosAndPreviewsDB(finalPhoto, preview.uri)
    await saveUrisTrash(uploadedPhoto.preview.fileId, preview.uri)
    await getPreviewAfterUpload(uploadedPhoto.preview, dispatch, preview.uri)

  } catch { } finally {
    dispatch(photoActions.updatePhotoStatusUpload(photo.hash, true))
  }
}

export async function uploadPreviewIfNull(photoId: number, originalPhoto: IHashedPhoto, dispatch: any, apiPhoto: IAPIPhoto) {
  dispatch(photoActions.updatePhotoStatusUpload(originalPhoto.hash, false))

  const prev = await manipulateAsync(
    originalPhoto.uri,
    [{ resize: { width: 220 } }],
    { compress: 0.5, format: SaveFormat.JPEG }
  )

  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')
  const headers = {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic,
    'Content-Type': 'multipart/form-data',
    'internxt-version': PackageJson.version,
    'internxt-client': 'drive-mobile'
  };

  const parsedUri = prev.uri.replace(/^file:\/\//, '');

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(parsedUri)) : RNFetchBlob.wrap(prev.uri)

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

      dispatch(photoActions.updatePhotoStatusUpload(originalPhoto.hash, true))
      throw res;
    }).then((preview: IApiPreview) => {
      const photo = {
        ...apiPhoto,
        preview: preview
      }

      return savePhotosAndPreviewsDB(photo, prev.uri, dispatch).then(() => {
        dispatch(photoActions.updatePhotoStatusUpload(photo.hash, true))
        saveUrisTrash(preview.fileId, prev.uri).then(() => {
          getPreviewAfterUpload(preview, dispatch, prev.uri).then()
        })
      }).catch((err) => {

        dispatch(photoActions.updatePhotoStatusUpload(photo.hash, true))
      })
    })
}

export async function getPreviewAfterUpload(preview: IApiPreview, dispatch: any, pathToRemove: string): Promise<any> {
  return downloadPreviewAfterUpload(preview, dispatch).then((path) => {
    if (path) {
      return updateLocalUriPreviews(preview, path).then(() => {
        RNFS.unlink(pathToRemove).then(() => {
          removeUrisFromUrisTrash(preview.fileId).then(() => {
            RNFS.exists(pathToRemove).then((res) => {
            }).catch(err => {
              throw new Error(err)
            })
          })
        }).catch(err => {
          throw new Error(err)
        })
      }).catch(err => {
      })
    }
    return path;
  }).catch(err => {
    throw new Error(err)
  })
}

export async function downloadPreviewAfterUpload(preview: IApiPreview, dispatch: any): Promise<any> {
  if (!preview) {
    dispatch(photoActions.updatePhotoStatusUpload(preview.hash, true))
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

    preview.localUri = localPreview.path;
    dispatch(photoActions.updatePhotoStatusUpload(preview.hash, true))
    return Promise.resolve(preview.localUri)
  }

  return RNFetchBlob.config({
    path: tempPath,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then((res) => {
    dispatch(photoActions.updatePhotoStatusUpload(preview.hash, true))
    return res.path();
  }).catch(err => {
    RNFS.unlink(tempPath).catch(err => {
      throw new Error(err)
    })
    throw new Error(err);
  })
}

export interface LocalImages {
  endCursor: string | undefined
  assets: IHashedPhoto[]
  hasNextPage: boolean
}

export const getLocalImages = async (after?: string | undefined): Promise<LocalImages> => {
  const result: LocalImages = {
    endCursor: undefined,
    assets: [],
    hasNextPage: false
  }

  const permissions = await MediaLibrary.requestPermissionsAsync()

  if (permissions.status !== 'granted') {
    return
  }
  const assets = await MediaLibrary.getAssetsAsync({ first: 20, after: after, sortBy: [MediaLibrary.SortBy.modificationTime] })
  const hashedAssets = await getArrayPhotos(assets.assets)

  result.endCursor = assets.endCursor
  result.assets = hashedAssets
  result.hasNextPage = assets.hasNextPage

  return result
}

export const getRecentlyDownloadedImage = (): Promise<IHashedPhoto[]> => {
  return MediaLibrary.getAssetsAsync({ first: 1, sortBy: [MediaLibrary.SortBy.modificationTime] })
    .then(res => {
      return getArrayPhotos(res.assets)
    })
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
  }).catch((err) => {
    return err;
  })
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
  const TempDir = RNFetchBlob.fs.dirs.CacheDir + '/drive-photos-fileviewer';
  const TempDirExists = await RNFetchBlob.fs.exists(TempDir);

  if (!TempDirExists) {
    RNFS.mkdir(TempDir)
  }

  return TempDir;
}

export async function cachePicture(filename: string, localUri: string): Promise<string> {
  const tempPath = await getLocalViewerDir()
  const tempFile = tempPath + '/' + filename
  const fileExists = await RNFS.exists(tempFile)

  if (!fileExists && localUri) {
    await RNFS.copyFile(localUri, tempFile)
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

export async function downloadPhoto(photo: any, setProgress?: (progress: number) => void) {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const type = photo.type.toLowerCase()

  const tempDir = await getLocalPhotosDir();

  return RNFetchBlob.config({
    path: `${tempDir}/${photo.id}.${type}`,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/download/photo/${photo.photoId}`, {
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
  }).then(async res => {
    await CameraRoll.save(res.path());
    return res.path()
  })
}

export async function downloadPhotoWithOutProgress(photo: any) {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const type = photo.type.toLowerCase()

  const tempDir = await getLocalPhotosDir();

  return RNFetchBlob.config({
    path: `${tempDir}/${photo.id}.${type}`,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/download/photo/${photo.id}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then((res) => {
    if (res.respInfo.status !== 200) {
      throw Error('Unable to download picture')
    }
    return res;
  }).then(async res => {
    await CameraRoll.save(res.path());
    return res.path()
  })
}

export const downloadPreview = async (preview: IApiPreview, tempPath: string): Promise<string | void> => {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')

  try {
    const downloadedPreview = await RNFetchBlob.config({
      path: tempPath,
      fileCache: true
    }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
      'Authorization': `Bearer ${xToken}`,
      'internxt-mnemonic': xUserJson.mnemonic
    }).catch(err => {
      throw new Error('RNFetchBlob error: ' + err)
    })

    if (downloadedPreview.respInfo.status !== 200) {
      throw new Error('Could not download image')
    }

    return downloadedPreview.path()
  } catch (err) {
    RNFS.unlink(tempPath)
    throw new Error(err)
  }
}

export async function downloadPreviewOLD(preview: any, photo: IApiPhotoWithPreview): Promise<any> {
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

export async function getListPreviews() {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/previews`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status !== 200) { throw res; }
    return res.json();
  })
}

let SHOULD_STOP = false;

export function stopSync(): void {
  SHOULD_STOP = true;
}

const existsPreview = async (preview: IApiPreview): Promise<{ exists: boolean, tempPath: string }> => {
  const { type, fileId } = preview
  const tempDir = await getLocalPreviewsDir()
  const tempPath = tempDir + '/' + fileId + '.' + type

  const exists = await RNFS.exists(tempPath)

  return { exists, tempPath }
}

export const getPreviews = async (dispatch: any): Promise<void> => {
  SHOULD_STOP = false
  const uploadedPhotos = (await getUploadedPhotos()).filter(photo => photo.preview)

  if (!uploadedPhotos) {
    return
  }

  for (const photo of uploadedPhotos) {
    try {
      if (SHOULD_STOP) {
        break
      }
      const checkExistUri = await checkExistsUriTrash(photo.preview.fileId)

      if (checkExistUri) {
        await getPreviewAfterUpload(photo.preview, dispatch, checkExistUri.uri)

        continue
      }
      let previewPath
      const { exists, tempPath } = await existsPreview(photo.preview)

      if (exists) {
        const localPreview = await RNFS.stat(tempPath)

        photo.localUri = localPreview.path
        previewPath = localPreview.path
      } else {
        previewPath = await downloadPreview(photo.preview, tempPath)
      }

      if (previewPath) {
        await savePhotosAndPreviewsDB(photo, previewPath)
      }
    } catch { continue }
  }
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

export async function getNullPreviews() {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/exists/previews`, {
    method: 'GET',
    headers
  }).then(res => {
    return res.json()
  }).then((res) => {
    return res;
  })
}