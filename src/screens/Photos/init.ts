import { mapSeries } from 'async';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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

export function syncPhotos(images: IHashedPhoto[]) {
  return mapSeries(images, (image, next) => {

    const photo = {
      uri: image.localUri,
      id: image.id,
      hash: image.hash,
      name: image.filename
    }

    uploadPhoto(photo).then(() => next(null)).catch(next)
  })
}

async function uploadPhoto(result: any) {
  try {
    // Set name for pics/photos
    if (!result.name) {
      result.name = result.split('/').pop();
    }

    const xUser = await deviceStorage.getItem('xUser')
    const xToken = await deviceStorage.getItem('xToken')
    const xUserJson = JSON.parse(xUser || '{}')

    const regex = /^(.*:\/{0,2})\/?(.*)$/gm

    const body = new FormData();

    body.append('xfile', result, result.name);

    const headers = {
      'Authorization': `Bearer ${xToken}`,
      'internxt-mnemonic': xUserJson.mnemonic,
      'Content-Type': 'multipart/form-data'
    };

    const file = result.uri.replace(regex, '$2')

    const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.uri);

    return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photo/upload`, headers,
      [
        { name: 'xfile', filename: result.name, data: finalUri },
        { name: 'hash', data: result.hash }
      ])
      .then((res) => {
        if (res.respInfo.status === 401) {
          throw res;
        } else if (res.respInfo.status === 402) {
          //setHasSpace(false)

        } else if (res.respInfo.status === 201) {
          return res.json();
        }
        return
      })
      .then(async res => {
        // Create photo preview and store on device
        const prev = await manipulateAsync(
          result.uri,
          [{ resize: { width: 220 } }],
          { compress: 1, format: SaveFormat.JPEG }
        )
        const preview = {
          uri: prev.uri,
          height: prev.height,
          widht: prev.width,
          name: result.name,
          photoId: res.id
        };

        return uploadPreview(preview);
      })
      .catch((err) => {
      })

  } catch (err) {
    return
  }
}

const uploadPreview = async (preview: any) => {
  const body = new FormData();

  preview.uri.replace('file:///', 'file:/');

  body.append('xfile', preview, preview.name);
  body.append('photoId', preview.photoId);

  const regex = /^(.*:\/{0,2})\/?(.*)$/gm
  const file = preview.uri.replace(regex, '$2')

  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')
  const headers = {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic,
    'Content-Type': 'multipart/form-data'
  };

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(preview.uri);

  return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/preview/upload/${preview.photoId}`, headers,
    [
      { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
    ])
    .then((res) => {
      if (res.respInfo.status === 401) {
        throw res;
      }

      const data = res;

      return { res: res, data };
    })
    .then(res => {
      if (res.res.respInfo.status === 402) {

      } else if (res.res.respInfo.status === 201) {
        // PREVIEW UPLOADED
        return
      }
    })
    .catch((err) => {
      return
    })
}

export function getLocalImages(after?: string | undefined) {
  const result = {
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

export async function downloadPreview(preview: any, photo: IApiPhotoWithPreview) {
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

export function getPreviews(): Promise<any> {
  SHOULD_STOP = false;
  return getUploadedPhotos().then((res) => {
    return mapSeries(res, (photo, next) => {
      if (SHOULD_STOP) {
        throw Error('Sign out')
      }

      return downloadPreview(photo.preview, photo).then((res1) => {
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