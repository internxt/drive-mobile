import { ImageResult, manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { Asset, getAssetInfoAsync, getAssetsAsync, requestPermissionsAsync, SortBy } from 'expo-media-library'
import { IApiPhotoWithPreview, IApiPreview, IHashedPhoto, LocalImages } from '../interfaces/photos'
import allSettled from 'promise.allsettled'
import { copyFile, exists, hash, mkdir, stat, unlink } from 'react-native-fs'
import { differenceBy } from 'lodash'
import { mapSeries, queue } from 'async'
import { downloadPreview, downloadPreviewAfterUpload, getUploadedPhotos, initializePhotosUser, photosUserData, uploadPhoto, uploadPreviewIfNull } from '../apis/photoGallery'
import { checkExistsUriTrash, removeUrisFromUrisTrash, savePhotosAndPreviewsDB, updateLocalUriPreviews } from '../../database/DBUtils.ts/utils'
import RNFetchBlob from 'rn-fetch-blob'
import { Platform } from 'react-native'
import { deviceStorage } from '../../helpers'

let SHOULD_STOP = false;

export function stopSync(): void {
  SHOULD_STOP = true;
}

export const getLocalImages = async (after?: string | undefined): Promise<LocalImages> => {
  const result: LocalImages = {
    endCursor: undefined,
    assets: [],
    hasNextPage: false
  }

  const permissions = await requestPermissionsAsync()

  if (permissions.status !== 'granted') {
    return
  }
  const assets = await getAssetsAsync({ first: 20, after: after, sortBy: [SortBy.modificationTime] })
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
      hash: await hash(photo.localUri, 'sha256'),
      localUri: photo.localUri
    }
  }))

  return assets
    .filter(promiseRes => promiseRes.status === 'fulfilled')
    .map(fullfiledRes => fullfiledRes.value)
}

export const separatePhotos = (images: IHashedPhoto[], withPreviews: IApiPhotoWithPreview[], alreadyUploadedPhotos: IApiPhotoWithPreview[]): IHashedPhoto[] => {
  let difference = []

  if (withPreviews.length === 0) {
    difference = differenceBy([...images], [...alreadyUploadedPhotos], 'hash')
  } else {
    const uploadedHashes = withPreviews.map(x => x.hash);
    const photos = images.filter(x => uploadedHashes.indexOf(x.hash) < 0)

    difference = differenceBy([...photos], [...alreadyUploadedPhotos], 'hash')
  }

  return difference
}

export const syncPhotos = async (images: IHashedPhoto[], dispatch: any): Promise<void> => {
  const photoQueue = queue(async (task: () => Promise<void>, callBack) => {
    await task()
    callBack()
  }, 5)

  images.forEach(image => photoQueue.push(() => uploadPhoto(image, dispatch)))
  return photoQueue.drain()
}

export const syncPreviews = async (images: any[], dispatch): Promise<void> => {
  await mapSeries(images, (image, next) => {
    if (image === undefined) {
      return;
    }
    return uploadPreviewIfNull(image.photo.id, image, dispatch, image.photo).then(() => next(null)).catch((err) => next(null))
  })
}

export const createCompressedPhoto = async (pathToPhoto: string): Promise<ImageResult> => {
  const preview = await manipulateAsync(pathToPhoto, [{ resize: { width: 220 } }],
    { compress: 0.8, format: SaveFormat.JPEG }
  )

  return preview
}

export const getPreviewAfterUpload = async (preview: IApiPreview, dispatch: any, pathToRemove: string): Promise<string> => {
  const { exists, tempPath } = await existsPreview(preview)

  if (exists) {
    const localPreview = await stat(tempPath);

    preview.localUri = localPreview.path;
    return preview.localUri
  }
  const path = await downloadPreviewAfterUpload(preview, tempPath, dispatch)

  if (!path) { throw new Error('Downloaded preview has no path') }
  await Promise.all([
    updateLocalUriPreviews(preview, path),
    unlink(pathToRemove),
    removeUrisFromUrisTrash(preview.fileId)
  ])

  return path
}

export const getLocalPreviewsDir = async (): Promise<string> => {
  const tempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.DocumentDir) + '/drive-photos-previews'
  const exists = await RNFetchBlob.fs.exists(tempDir)

  if (!exists) {
    mkdir(tempDir)
  }
  return tempDir
}

export const getLocalViewerDir = async (): Promise<string> => {
  const tempDir = RNFetchBlob.fs.dirs.CacheDir + '/drive-photos-fileviewer'
  const exists = await RNFetchBlob.fs.exists(tempDir)

  if (!exists) {
    mkdir(tempDir)
  }

  return tempDir;
}

export const cachePicture = async (filename: string, localUri: string): Promise<string> => {
  const tempPath = await getLocalViewerDir()
  const tempFile = tempPath + '/' + filename
  const fileExists = await exists(tempFile)

  if (!fileExists && localUri) {
    await copyFile(localUri, tempFile)
  }

  return tempFile;
}

export const getLocalPhotosDir = async (): Promise<string> => {
  const tempDir = (Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir : RNFetchBlob.fs.dirs.DocumentDir) + '/drive-photos'
  const exists = await RNFetchBlob.fs.exists(tempDir)

  if (!exists) {
    mkdir(tempDir)
  }
  return tempDir;
}

const existsPreview = async (preview: IApiPreview): Promise<{ exists: boolean, tempPath: string }> => {
  const { type, fileId } = preview
  const tempDir = await getLocalPreviewsDir()
  const tempPath = tempDir + '/' + fileId + '.' + type

  const existsPreview = await exists(tempPath)

  return { exists: existsPreview, tempPath }
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
        const localPreview = await stat(tempPath)

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
