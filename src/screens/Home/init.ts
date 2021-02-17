import { getHeaders } from '../../helpers/headers'
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import { Dispatch } from 'redux';
import { PhotoActions } from '../../redux/actions';

export async function getAlbumList(email: string, token: string, mnemonic: string) {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/albums/${email}`, {
    method: 'GET',
    headers: getHeaders(token, mnemonic)
  }).then(async res => {
    if (res.status === 200) {
      return res;
    } else {

    }
  })
}

export async function getAllPhotos(email: string, token: string, mnemonic: string) {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${email}`, {
    method: 'GET',
    headers: getHeaders(token, mnemonic)
  }).then(async res => {
    if (res.status === 200) {
      return res;
    } else if (res.status === 201) {
      return null;
    } else {

    }
  })
}

export async function getDeletedPhotos(email: string, token: string, mnemonic: string) {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/deletes/${email}`, {
    method: 'GET',
    headers: getHeaders(token, mnemonic)
  }).then(async res => {
    if (res.status === 200) {
      return res;
    } else {

    }
  })
}

export function getAllLocalPhotos(dispatch: Dispatch) {
  return Permissions.askAsync(Permissions.MEDIA_LIBRARY)
    .then(() => {
      return MediaLibrary.getAssetsAsync();
    })
    .then((res) => {
      dispatch(PhotoActions.getAllLocalPhotos(res.assets))
    })
}