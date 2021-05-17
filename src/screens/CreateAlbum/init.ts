import { getRepository } from 'typeorm/browser'
import { saveAlbums } from '../../database/DBUtils.ts/utils'
import { Photos } from '../../database/models/photos'
import { Previews } from '../../database/models/previews'
import { deviceStorage } from '../../helpers'
import { getHeaders } from '../../helpers/headers'

export async function getItemsLocalStorage() {
  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')

  return { xToken, xUserJson }
}
export async function uploadAlbum(albumTitle: string, selectedPhotos: Previews[]): Promise<void> {

  const items = await getItemsLocalStorage()
  const mnemonic = items.xUserJson.mnemonic
  const xToken = items.xToken
  const headers = await getHeaders(xToken, mnemonic)

  const photosRepository = getRepository(Photos);
  const listphotos = [];

  selectedPhotos.map(async (res) => {
    const photos = await photosRepository.find({
      where: {
        userId: items.xUserJson.userId
      }
    })

    listphotos.push(photos)
  })

  const body = { name: albumTitle, photos: selectedPhotos }

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/album`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  }).then(res => {
    if (res.status === 200) {
      saveAlbums(listphotos, albumTitle)
    }
    return res.json()
  })
}

export async function deleteAlbum(albumId: number): Promise<void> {

  const items = await getItemsLocalStorage()
  const mnemonic = items.xUserJson.mnemonic
  const xToken = items.xToken
  const headers = await getHeaders(xToken, mnemonic)

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/delete/album/${albumId}`, {
    method: 'DELETE',
    headers: headers
  }).then(res => {
    if (res.status === 204) {
      deleteAlbum(albumId)
    }
    return res.json()
  })
}

export async function deletePhotoAlbum(albumId: number): Promise<void> {

  const items = await getItemsLocalStorage()
  const mnemonic = items.xUserJson.mnemonic
  const xToken = items.xToken
  const headers = await getHeaders(xToken, mnemonic)

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/delete/album/${albumId}`, {
    method: 'DELETE',
    headers: headers
  }).then(res => {
    if (res.status === 204) {
      deletePhotoAlbum(albumId)
    }
    return res.json()
  })
}

export async function updateNameAlbum(name: string, id: number): Promise<void> {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_API_URL}/photos/album/metadata/${id}`, {
    method: 'post',
    headers: headers,
    body: JSON.stringify({ name })
  }).then(res => {
    if (res.status === 200) {
      return updateNameAlbum(name, id)
    }
    throw Error(res.statusText)
  })
}
