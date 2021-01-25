import { getHeaders } from '../../helpers/headers'

export async function getAlbumList(email: string, token:string, mnemonic:string) {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/albums/${email}`, {
      method: 'GET',
      headers: getHeaders(token, mnemonic)
    }).then(async res => {
      if (res.status === 200) {
        return res;
      } else {
        console.log("Error getting server albums", res)
      }
    })
}

export async function getAllPhotos(email: string, token:string, mnemonic:string) {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${email}`, {
      method: 'GET',
      headers: getHeaders(token, mnemonic)
    }).then(async res => {
      if (res.status === 200) {
        return res;
      } else {
        console.log("Error getting server photos", res)
      }
    })
}

export async function getDeletedPhotos(email: string, token:string, mnemonic:string) {
    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/delete/${email}`, {
      method: 'GET',
      headers: getHeaders(token, mnemonic)
    }).then(async res => {
      if (res.status === 200) {
        return res;
      } else {
        console.log("Error getting server deleted", res)
      }
    })
}