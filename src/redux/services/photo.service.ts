import { deviceStorage } from '../../helpers';
import { sortTypes } from '../constants';
import { compare } from 'natural-orderby'
import * as FileSystem from 'expo-file-system';
import { previewsStorage } from '../../helpers/previewsStorage';
import { getPhotos } from '../../helpers/mediaAccess';
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import { IPhoto } from '../../components/PhotoList';

export const photoService = {
  getSortFunction,
  setHeaders,
  getAlbumContent,
  getAllPhotosContent,
  getDeletedPhotos,
  deleteTempPhoto,
  getDevicePhotos,
  uploadPhotos,
  uploadPhoto,
  uploadPreview,
  createAlbum
};

async function setHeaders() {
  const token = await deviceStorage.getItem('xToken');
  const user = JSON.parse(await deviceStorage.getItem('xUser') || '');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-type': 'application/json; charset=utf-8',
    'internxt-mnemonic': user.mnemonic
  };

  return headers;
}

// To obtain an AlbumView of an albumId
function getAlbumContent(albumId: number): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/album/${albumId}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function getAllPhotosContent(user: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${user.email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(async (res2) => {
      if (res2) {

        const completedPhotos = await previewsStorage.matchPreviews(res2);

        resolve(completedPhotos)
      }
      resolve('');
    })
      .catch(reject);
  });
}

function getDeletedPhotos(user: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/deletes/${user.email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(async (res2) => {
      if (res2) {
        const completedPhotos = await previewsStorage.matchPreviews(res2);

        resolve(completedPhotos)
      }
      resolve('');
    })
      .catch(reject);
  });
}

async function getDevicePhotos(user: any, cursor: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    getPhotos(user.rootAlbumId, cursor).then((dataResult) => {

      console.log('DEVICE PHOTOS---', dataResult?.photos)

      //dataResult.photos.map()
      resolve(dataResult)
    }).catch((err) => {
      reject;
    })
  });
}

function uploadPhotos(auth: any, photos: any) {
  console.log('AUTH', auth)
  return Promise.all(photos.map(async (photo: IPhoto) => {
    console.log('UPLOADING PHOTO....', photo)
    await uploadPhoto(auth.user, auth.token, photo);
    console.log('UPLOAD FINISHED')
  }))
}

async function uploadPhoto(user: any, token: any, photo: any) {

  //const userData = await getLyticsData()

  //analytics.track('photo-upload-start', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })

  try {
    const mnemonic = user.mnemonic;

    // Translate to Home
    //props.dispatch(PhotoActions.uploadPhotoStart(result.name));
    const regex = /^(.*:\/{0,2})\/?(.*)$/gm

    const body = new FormData();

    body.append('xfile', photo, photo.name);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'internxt-mnemonic': mnemonic,
      'Content-Type': 'multipart/form-data'
    };

    const file = photo.uri.replace(regex, '$2')

    const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(photo.uri);

    RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photo/upload`, headers,
      [
        { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
      ])
      .uploadProgress({ count: 10 }, (sent, total) => {
        //props.dispatch(PhotoActions.uploadPhotoSetProgress(sent / total))

      })
      .then((res) => {

        if (res.respInfo.status === 401) {
          throw res;
        } else if (res.respInfo.status === 402) {
          //setHasSpace(false)

        } else if (res.respInfo.status === 201) {
          return res.json();
        } else {
          //Alert.alert('Error', 'Cannot upload photo');
        }
      })
      .then(async res => {
        //analytics.track('photo-upload-finished', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { });

        // Create photo preview and store on device
        const preview = {
          uri: photo.preview,
          height: photo.height,
          widht: photo.width,
          name: photo.name,
          photoId: res.id
        };

        //uploadPreview(preview, headers)

        console.log('UPLOAAAD---', res)
        //uploadPreview(preview, props, headers);

        //props.dispatch(PhotoActions.getAllPhotosContent(props.authenticationState.user));
        //props.dispatch(PhotoActions.uploadPhotoSetProgress(0));
        //props.dispatch(PhotoActions.uploadPhotoFinished());
      })
      .catch((err) => {
        if (err.status === 401) {
          //props.dispatch(userActions.signout())

        } else {
          //Alert.alert('Error', 'Cannot upload file\n' + err)
        }

        //props.dispatch(PhotoActions.uploadPhotoFailed());
        //props.dispatch(PhotoActions.uploadPhotoFinished());
      })

  } catch (error) {
    console.log('ERROR 1---', error)
    //analytics.track('photo-upload-error', { userId: userData.uuid, email: userData.email, device: 'mobile' }).catch(() => { })
    //props.dispatch(PhotoActions.uploadPhotoFailed());
    //props.dispatch(PhotoActions.uploadPhotoFinished());
  }
}

function uploadPreview (preview: any, headers: any) {
  const body = new FormData();

  preview.uri.replace('file:///', 'file:/');

  body.append('xfile', preview, preview.name);
  body.append('photoId', preview.photoId);

  const regex = /^(.*:\/{0,2})\/?(.*)$/gm
  const file = preview.uri.replace(regex, '$2')

  const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(file) : RNFetchBlob.wrap(preview.uri);

  RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/preview/upload/${preview.photoId}`, headers,
    [
      { name: 'xfile', filename: body._parts[0][1].name, data: finalUri }
    ])
    .uploadProgress({ count: 10 }, (sent, total) => {

    })
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
      } else {

      }
    })
    .catch((err) => {
      if (err.status === 401) {
        //props.dispatch(userActions.signout())
      } else {
      }
    })
}

function createAlbum (name: any, photos: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/album`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, photos })
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function deleteTempPhoto(photoId: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/delete/temp/photo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ photoId })
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

export type ArraySortFunction = (a: any, b: any) => boolean

function getSortFunction(sortType: string): ArraySortFunction | null {
  let sortFunc = null;

  switch (sortType) {
  case sortTypes.DATE_ADDED:
    sortFunc = (a: any, b: any) => a.id > b.id;
    break;
  case sortTypes.FILETYPE_ASC:
    sortFunc = (a: any, b: any) => {
      return a.type
        ? a.type.toLowerCase().localeCompare(b.type.toLowerCase())
        : true;
    };
    break;
  case sortTypes.FILETYPE_DESC:
    sortFunc = (a: any, b: any) => {
      return b.type
        ? b.type.toLowerCase().localeCompare(a.type.toLowerCase())
        : true;
    };
    break;
  case sortTypes.NAME_ASC:
    sortFunc = (a: any, b: any) => {
      return compare({ order: 'asc' })(a.name.toLowerCase(), b.name.toLowerCase())
    };
    break;
  case sortTypes.NAME_DESC:
    sortFunc = (a: any, b: any) => {
      return compare({ order: 'desc' })(a.name.toLowerCase(), b.name.toLowerCase())
    };
    break;
  case sortTypes.SIZE_ASC:
    sortFunc = (a: any, b: any) => a.size ? a.size - b.size : true;
    break;
  case sortTypes.SIZE_DESC:
    sortFunc = (a: any, b: any) => b.size ? b.size - a.size : true;
    break;
  default:
    break;
  }

  return sortFunc;
}