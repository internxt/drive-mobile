import { mapSeries } from 'async';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset, getAssetInfoAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system'
import RNFS from 'react-native-fs';
import { deviceStorage } from '../../helpers';
import { PhotoActions, userActions } from '../../redux/actions';
import { Dispatch } from 'redux';
import { IHomeProps } from './'
import { store } from '../../store';
import SimpleToast from 'react-native-simple-toast';

export interface IHashedPhoto extends Asset {
  hash: string,
  localUri: string | undefined
  isSynced?: boolean
  isUploaded?: boolean
}

const getArrayPhotos = async(images: Asset[]) => {
  const result: Promise<IHashedPhoto[]> = mapSeries(images, async (image, next) => {
    const asset = await getAssetInfoAsync(image)
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

export function syncPhotos(images: IHashedPhoto[], props: any) {
  return mapSeries(images, (image, next) => {

    const photo = {
      uri: image.localUri,
      id: image.id,
      hash: image.hash,
      name: image.filename
    }

    return uploadPhoto(photo, props).then(() => next(null)).catch(next)
  })
}

export async function uploadPhoto (result: any, props: any) {

  try {
    // Set name for pics/photos
    if (!result.name) {
      result.name = result.split('/').pop();
    }

    const token = props.authenticationState.token;
    const mnemonic = props.authenticationState.user.mnemonic;
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm

    const body = new FormData();

    body.append('xfile', result, result.name);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'internxt-mnemonic': mnemonic,
      'Content-Type': 'multipart/form-data'
    };

    const file = result.uri.replace(regex, '$2')

    const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(result.uri);

    return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photo/upload`, headers,
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

        return uploadPreview(preview, props, headers);
      })
      .catch((err) => {

      })

  } catch (err) {
    return
  }
}

const uploadPreview = async (preview: any, props: any, headers: any) => {
  const body = new FormData();

  preview.uri.replace('file:///', 'file:/');

  body.append('xfile', preview, preview.name);
  body.append('photoId', preview.photoId);

  const regex = /^(.*:\/{0,2})\/?(.*)$/gm
  const file = preview.uri.replace(regex, '$2')

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(preview.uri);

  return RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/preview/upload/${preview.photoId}`, headers,
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

export function getAssetAsyncLocalPhotos() {

}

export function getLocalImages(dispatch: Dispatch, gallery: boolean, after?: string) {
  return Permissions.askAsync(Permissions.MEDIA_LIBRARY)
    .then(() => {
      if (after) {
        return MediaLibrary.getAssetsAsync({ first: 39, after });
      }

      return MediaLibrary.getAssetsAsync({ first: 100000 });
    })
    .then(async (res) => {
      await getArrayPhotos(res.assets).then(res => {
        if (gallery) {
          dispatch(PhotoActions.setAllLocalPhotosGallery(res))
        } else {
          dispatch(PhotoActions.setAllLocalPhotos(res))
        }
      })
      return res.endCursor
    })
}

export function getUploadedPhotos(authenticationState: any, dispatch: Dispatch): Promise<any> {
  return new Promise(async (resolve, reject) => {

    const email = authenticationState.user.email
    const token = authenticationState.token;
    const mnemonic = authenticationState.user.mnemonic;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'internxt-mnemonic': mnemonic,
      'Content-Type': 'application/json; charset=utf-8'
    };

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photos/${email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(async res => {

      dispatch(PhotoActions.setAllUploadedPhotos(res))
      return resolve(res)
    })
      .catch(err => {
        reject
      });
  });
}

export async function downloadPhoto(photo: any) {

  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const type = photo.type.toLowerCase()

  return RNFetchBlob.config({
    path: Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir + `.${type}` : RNFetchBlob.fs.dirs.PictureDir + `.${type}`,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/photos/download/photo/${photo.photoId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then(async (res) => {
    if (res.respInfo.status === 200) {
      await MediaLibrary.saveToLibraryAsync(res.path())
      SimpleToast.show('Image downloaded!', 0.3)
      return
    }
    return

  }).catch(async err => {
    return
  }).finally(() => {
    return
  })
}

export const downloadPreview = async(preview: any, props: IHomeProps) => {
  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const typePreview = preview.type
  const name = preview.name

  return RNFetchBlob.config({
    path: Platform.OS === 'android' ? RNFetchBlob.fs.dirs.CacheDir + name + '.' + typePreview : RNFetchBlob.fs.dirs.PictureDir + name + '.' + typePreview,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then(async (res) => {

    const result = {
      localUri: res.path(),
      data: res.data,
      photoId: preview.photoId,
      type: preview.type
    }

    const currentPreviews = store.getState().photosState.previews

    if (!currentPreviews.find(photo => photo.photoId === result.photoId)) {
      props.dispatch(PhotoActions.pushPreview(result))
    }

  }).catch(err => {
  })
}

export const getArrayPreviews = async(props: any) => {
  return new Promise(async (resolve, reject) => {

    const token = props.authenticationState.token;
    const mnemonic = props.authenticationState.user.mnemonic;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'internxt-mnemonic': mnemonic,
      'Content-Type': 'application/json; charset=utf-8'
    };

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/previews/`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(async (res2) => {
      resolve(res2)
    })
      .catch(reject);
  });
}

let SHOULD_STOP = false;

export function stopSync(): void {
  SHOULD_STOP = true;
}

export function getPreviews(props: IHomeProps): Promise<any> {
  SHOULD_STOP = false;
  return getArrayPreviews(props).then((res: any) => {
    return mapSeries(res, (preview, next) => {
      if (SHOULD_STOP) {
        throw Error('Sign out')
      }

      return downloadPreview(preview, props).then((res1) => {
        next(null, res1)
      });
    });
  });
}