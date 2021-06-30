import { deviceStorage } from '../../helpers'
import { photoActions } from '../../redux/actions'
import PackageJson from '../../../package.json'
import { Platform } from 'react-native'
import RNFetchBlob from 'rn-fetch-blob'
import { createCompressedPhoto, getLocalPhotosDir, getPreviewAfterUpload } from '../services/photoGallery'
import { getHeaders } from '../../helpers/headers'
import { Dispatch, SetStateAction } from 'react'
import { IAPIPhoto, IApiPhotoWithPreview, IApiPreview, IHashedPhoto, IPhotoToRender, IUploadedPhoto } from '../interfaces/photos'
import { savePhotosAndPreviewsDB, saveUrisTrash } from '../../database/DBUtils.ts/utils'
import { unlink } from 'react-native-fs'
import CameraRoll from '@react-native-community/cameraroll'

export const uploadPhoto = async (photo: IHashedPhoto, dispatch: any) => {
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
    let uriPhoto: string, uriPreview: string, creationTime: string | number

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
    }).fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/photo/preview/upload`, headers,
      [
        { name: 'xfiles', filename: photo.filename, data: uriPhoto },
        { name: 'xfiles', filename: `preview-${photo.filename}`, data: uriPreview },
        { name: 'hash', data: photo.hash },
        { name: 'creationTime', data: creationTime }
      ])
      .catch(err => {
        throw new Error(err)
      })
    const status = fetchResponse.respInfo.status

    if (status !== 201 && status !== 409) {
      throw new Error('Server error status response: ' + status + ' ' + fetchResponse.data)
    }
    const uploadedPhoto: IUploadedPhoto = await fetchResponse.json()

    if (!uploadedPhoto.photo.id) {
      throw new Error('Photo without id')
    }
    const finalPhoto = {
      ...uploadedPhoto.photo,
      preview: uploadedPhoto.preview
    }

    Promise.all([
      savePhotosAndPreviewsDB(finalPhoto, preview.uri),
      saveUrisTrash(uploadedPhoto.preview.fileId, preview.uri),
      getPreviewAfterUpload(uploadedPhoto.preview, dispatch, preview.uri)
    ])
  } catch (err) { } finally {
    dispatch(photoActions.updatePhotoStatusUpload(photo.hash, true))
  }
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
  setProgress(0)
  return path
}

export const downloadPreview = async (preview: IApiPreview, tempPath: string): Promise<string> => {
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
    }).catch(err => {
      throw new Error('RNFetchBlob error: ' + err)
    })

    if (fetchResponse.respInfo.status !== 200) {
      throw new Error('Could not download image')
    }

    return fetchResponse.path()
  } catch (err) {
    unlink(tempPath)
    throw new Error(err)
  }
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
    }).catch(err => {
      throw new Error('RNFetchBlob error: ' + err)
    })

    if (fetchResponse.respInfo.status !== 200) {
      throw new Error('Could not download preview')
    }

    return fetchResponse.path()
  } catch {
    unlink(tempPath)
  } finally {
    dispatch(photoActions.updatePhotoStatusUpload(preview.hash, true))
  }
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
  } catch (err) { }
}

export const initializePhotosUser = async (): Promise<any> => {
  const xUser = await deviceStorage.getItem('xUser')
  const xToken = await deviceStorage.getItem('xToken')
  const xUserJson = JSON.parse(xUser || '{}')

  const fetchResponse = await fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/initialize`, {
    method: 'GET',
    headers: await getHeaders(xToken || '', xUserJson.mnemonic)
  })

  return fetchResponse.json()
}

export const photosUserData = async (): Promise<any> => {
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

export const getNullPreviews = async (): Promise<IApiPreview> => {
  const headers = await getHeaders()
  const fetchResponse = await fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/exists/previews`, {
    method: 'GET',
    headers
  })

  return fetchResponse.json()
}

// ! This method must get deleted in the future as the possibility of having null previews doesnt exist anymore
export const uploadPreviewIfNull = async (photoId: number, originalPhoto: IHashedPhoto, dispatch: any, apiPhoto: IAPIPhoto): Promise<void> => {
  dispatch(photoActions.updatePhotoStatusUpload(originalPhoto.hash, false))
  const compressedPhoto = await createCompressedPhoto(originalPhoto.uri)

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

  try {
    const parsedUri = compressedPhoto.uri.replace(/^file:\/\//, '')
    const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(parsedUri)) : RNFetchBlob.wrap(compressedPhoto.uri)
    const fetchResponse = await RNFetchBlob.fetch('POST', `${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/preview/upload/${photoId}`,
      headers,
      [
        { name: 'xfile', filename: originalPhoto.filename, data: finalUri }
      ])
    const status = fetchResponse.respInfo.status

    if (status !== 201 && status !== 409) {
      throw new Error('Could not upload preview, server response status: ' + status)
    }
    const preview = await fetchResponse.json()
    const newPreview = {
      ...apiPhoto,
      preview: preview
    }

    await savePhotosAndPreviewsDB(originalPhoto, compressedPhoto.uri),
    await saveUrisTrash(newPreview.fileId, compressedPhoto.uri)
    await getPreviewAfterUpload(preview, dispatch, compressedPhoto.uri)
  } catch { } finally {
    dispatch(photoActions.updatePhotoStatusUpload(originalPhoto.hash, true))
  }
}

// TODO: Use both getPartialUploaded and getPartialRemote to recursively load photos instead of using a one big ass query which breaks the DB
/* export async function getPartialUploadedPhotos(matchImages: LocalImages): Promise<IApiPhotoWithPreview[]> {
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
*/