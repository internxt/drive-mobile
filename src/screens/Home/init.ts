import { getHeaders } from '../../helpers/headers'

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