import { mapSeries } from 'async';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Asset, getAssetInfoAsync } from 'expo-media-library';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import RNFS from 'react-native-fs';
import { deviceStorage } from '../../helpers';
import { PhotoActions } from '../../redux/actions';
import { Dispatch } from 'redux';

const getArrayPhotos = async(images: Asset[]) => {
  const result = mapSeries(images, async (image, next) => {

    const asset = await getAssetInfoAsync(image)

    const sha256Id = await RNFS.hash(asset.localUri, 'sha256')

    const file = {
      uri: asset.localUri,
      id: asset.id,
      hash: sha256Id,
      name: asset.filename
    }

    next(null, file)
  });

  return result;
}

export function syncPhotos(images: Asset[], props: any) {
  getArrayPhotos(images).then((res)=>{

    const result = mapSeries(res, (image, next) => {
      uploadPhoto(image, props).then(() => next(null)).catch(next)
    });
  });
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
        //console.log('preview uploaded')
        return
      }
    })
    .catch((err) => {
      return
    })
}

export function getLocalImages(dispatch: Dispatch) {
  return Permissions.askAsync(Permissions.MEDIA_LIBRARY)
    .then(() => {
      return MediaLibrary.getAssetsAsync({ first: 1000000 });
    })
    .then((result) => {
      dispatch(PhotoActions.setAllLocalPhotos(result.assets))
    });
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

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(res => {
      dispatch(PhotoActions.setAllUploadedPhotos(res))
      resolve(res)
    })
      .catch(reject);
  });
}

const downloadPhoto = async(props: any) => {

  const photoItem = props.photosState.selectedPhoto;

  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')

  return RNFetchBlob.config({
    path: RNFetchBlob.fs.dirs.PictureDir + '.jpg',
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photo/${'559e3a3c663b43bd6215b96c'}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then(async (res) => {

    if (res.respInfo.status === 200) {
      MediaLibrary.saveToLibraryAsync(res.path())

      return
    }
    return

  }).catch(async err => {
    return
  }).finally(() => {
    return
  })
}

const downloadPreview = async(preview: any, props: any) => {

  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const typePreview = preview.type

  return RNFetchBlob.config({
    path: RNFetchBlob.fs.dirs.PictureDir + '.' + typePreview,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${preview.fileId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).then((res) => {
    if (res.respInfo.status === 200) {

    }
    const result = {
      uri: res.path(),
      data: res.data,
      info: res.type
    }

    return result;

  })
}

const getArrayPreviews = async(props: any) => {
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

export function syncPreviews(props: any): Promise<any> {
  return getArrayPreviews(props).then((res: any) => {

    const result = mapSeries(res, (preview, next) => {
      return downloadPreview(preview, props).then((res1) => {

        next(null, res1)

      });
    });

    return result

  });
}