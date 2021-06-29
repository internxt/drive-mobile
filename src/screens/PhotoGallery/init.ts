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
import { IPhotoToRender } from '.';
import { Dispatch, SetStateAction } from 'react';

export interface LocalImages {
  endCursor: string | undefined
  assets: IHashedPhoto[]
  hasNextPage: boolean
}

export interface IHashedPhoto extends Asset {
  hash: string,
  localUri: string | undefined
  photoId: number
  type: string
}

interface IUploadedPhoto {
  photo: IAPIPhoto,
  preview: IApiPreview
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

export async function syncPhotos(images: IHashedPhoto[], dispatch: any): Promise<void> {
  const photoQueue = queue(async (task: () => Promise<void>, callBack) => {
    await task()
    callBack()
  }, 5)

  images.forEach(image => photoQueue.push(() => uploadPhoto(image, dispatch)))
  return photoQueue.drain()
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

export const getPreviewAfterUpload = async (preview: IApiPreview, dispatch: any, pathToRemove: string): Promise<string> => {
  const { exists, tempPath } = await existsPreview(preview)

  if (exists) {
    const localPreview = await RNFS.stat(tempPath);

    preview.localUri = localPreview.path;
    return preview.localUri
  }
  const path = await downloadPreviewAfterUpload(preview, tempPath, dispatch)

  if (!path) { throw new Error('Downloaded preview has no path') }
  await Promise.all([
    updateLocalUriPreviews(preview, path),
    RNFS.unlink(pathToRemove),
    removeUrisFromUrisTrash(preview.fileId)
  ])

  return path
}

export const downloadPreviewAfterUpload = async (preview: IApiPreview, tempPath: string, dispatch: any): Promise<string> => {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')

  try {
    const fetchResponse = await RNFetchBlob.config({
      path: tempPath,
      fileCache: true
    }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
      'Authorization': `Bearer ${xToken}`,
      'internxt-mnemonic': xUserJson.mnemonic
    })

    if (fetchResponse.respInfo.status !== 200) {
      throw new Error('Could not download preview')
    }

    return fetchResponse.path()
  } catch {
    RNFS.unlink(tempPath)
  } finally {
    dispatch(photoActions.updatePhotoStatusUpload(preview.hash, true))
  }
}

export const syncPreviews = async (images: any[], dispatch): Promise<void> => {
  await mapSeries(images, (image, next) => {
    if (image === undefined) {
      return;
    }
    return uploadPreviewIfNull(image.photo.id, image, dispatch, image.photo).then(() => next(null)).catch((err) => next(null))
  })
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

export const getUploadedPhotos = async (): Promise<IApiPhotoWithPreview[]> => {
  const headers = await getHeaders()

  try {
    const fetchResponse = await fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photos`, {
      method: 'GET',
      headers
    })

    if (fetchResponse.status !== 200) {
      throw new Error('Could not get uploaded photos, server responded with a ' + fetchResponse.status)
    }

    return fetchResponse.json()
  } catch (err) {
    throw new Error('Error retrieving uploaded photos: ' + err.message)
  }
}
export const getLocalPreviewsDir = async (): Promise<string> => {
  const tempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.DocumentDir) + '/drive-photos-previews'
  const exists = await RNFetchBlob.fs.exists(tempDir)

  if (!exists) {
    RNFS.mkdir(tempDir)
  }
  return tempDir
}

export const getLocalViewerDir = async (): Promise<string> => {
  const tempDir = RNFetchBlob.fs.dirs.CacheDir + '/drive-photos-fileviewer'
  const exists = await RNFetchBlob.fs.exists(tempDir)

  if (!exists) {
    RNFS.mkdir(tempDir)
  }

  return tempDir;
}

export const cachePicture = async (filename: string, localUri: string): Promise<string> => {
  const tempPath = await getLocalViewerDir()
  const tempFile = tempPath + '/' + filename
  const fileExists = await RNFS.exists(tempFile)

  if (!fileExists && localUri) {
    await RNFS.copyFile(localUri, tempFile)
  }

  return tempFile;
}

export const getLocalPhotosDir = async (): Promise<string> => {
  const tempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.DocumentDir) + '/drive-photos'
  const exists = await RNFetchBlob.fs.exists(tempDir)

  if (!exists) {
    RNFS.mkdir(tempDir)
  }
  return tempDir;
}

export const downloadPhoto = async (photo: IPhotoToRender, setProgress?: Dispatch<SetStateAction<number>>): Promise<string> => {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const { type, id, photoId } = photo
  const tempDir = await getLocalPhotosDir()

  const fetchResponse = await RNFetchBlob.config({
    path: `${tempDir}/${id}.${type}`,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/download/photo/${photoId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).progress((received: number, total: number) => {
    setProgress(received / total)
  })

  if (fetchResponse.respInfo.status !== 200) {
    throw new Error('Unable to download photo')
  }
  const path = fetchResponse.path()

  await CameraRoll.save(path)
  return path
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

const initializePhotosUser = async (): Promise<any> => {
  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')

  const fetchResponse = await fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/initialize`, {
    method: 'GET',
    headers: await getHeaders(xToken || '', xUserJson.mnemonic)
  })

  return fetchResponse.json()
}

const photosUserData = async (): Promise<any> => {
  const headers = await getHeaders()
  const fetchResponse = await fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/user`, {
    method: 'GET',
    headers
  })

  if (fetchResponse.status !== 200) {
    throw new Error('Could not get user data')
  }
  return fetchResponse.json()
}

async function isUserInitialized() {
  return photosUserData()
    .then((res) => {
      if (!res.rootPreviewId || !res.rootAlbumId) {
        return false
      }
      return true
    })
    .catch(() => false)
}

export async function initUser(): Promise<void> {
  const xPhotos = await deviceStorage.getItem('xPhotos')

  if (xPhotos) {
    return
  }
  const isInitialized = await isUserInitialized()

  if (!isInitialized) {
    await initializePhotosUser()
  }
  const infoUserPhoto = await photosUserData()

  await deviceStorage.saveItem('xPhotos', JSON.stringify(infoUserPhoto))
}

export const getNullPreviews = async (): Promise<IApiPreview> => {
  const headers = await getHeaders()
  const fetchResponse = await fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/exists/previews`, {
    method: 'GET',
    headers
  })

  return fetchResponse.json()
}