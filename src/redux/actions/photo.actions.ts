import { IPhotosToRender } from '../../screens/Photos';
import { IHashedPhoto } from '../../screens/Photos/init';
import { photoActionTypes } from '../constants/photoActionTypes.constants';

function startSync() {
  return { type: photoActionTypes.START_SYNC };
}

function stopSync() {
  return { type: photoActionTypes.STOP_SYNC };
}

function startSaveDB() {
  return { type: photoActionTypes.START_SAVE_DB };
}

function viewDB() {
  return { type: photoActionTypes.VIEW_DB };
}

function setPhotosToRender(payload: IPhotosToRender) {
  return { type: photoActionTypes.SET_PHOTOS_TO_RENDER, payload }
}

function pushDownloadedPhoto(photo: IHashedPhoto) {
  return { type: photoActionTypes.PUSH_DOWNLOADED_PHOTO, payload: photo }
}

const startPhotoUpload = (photoHash: string) => (
  { type: photoActionTypes.START_PHOTO_UPLOAD, payload: photoHash }
)
const stopPhotoUpload = (photoHash: string) => (
  { type: photoActionTypes.STOP_PHOTO_UPLOAD, payload: photoHash }
)

const startPhotoDownload = (photoHash: string) => (
  { type: photoActionTypes.START_PHOTO_DOWNLOAD, payload: photoHash }
)
const stopPhotoDownload = (photoHash: string) => (
  { type: photoActionTypes.STOP_PHOTO_DOWNLOAD, payload: photoHash }
)

export const photoActions = {
  startSync,
  stopSync,
  startSaveDB,
  viewDB,
  setPhotosToRender,
  pushDownloadedPhoto,
  startPhotoUpload,
  stopPhotoUpload,
  startPhotoDownload,
  stopPhotoDownload
}