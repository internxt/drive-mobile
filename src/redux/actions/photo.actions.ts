import { IPhotosToRender } from '../../screens/PhotoGallery';
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

const addPhotosToRender = (photos: IPhotosToRender) => {
  return { type: photoActionTypes.ADD_PHOTOS_TO_RENDER, payload: photos }
}

const clearPhotosToRender = () => {
  return { type: photoActionTypes.CLEAR_PHOTOS_TO_RENDER }
}

const updatePhotoStatusUpload = (hash: string, hasFinished: boolean) => {
  return { type: photoActionTypes.PHOTO_UPLOAD_UPDATE, payload: { hash, hasFinished } }
}

const updatePhotoStatusDownload = (hash: string, hasFinished: boolean) => {
  return { type: photoActionTypes.PHOTO_DOWNLOAD_UPDATE, payload: { hash, hasFinished } }
}

const updatePhotoStatusSelection = (hash: string) => ({ type: photoActionTypes.PHOTO_SELECTION_UPDATE, payload: { hash } })
const clearSelectedPhotos = () => ({ type: photoActionTypes.PHOTO_SELECTION_CLEAR })

const updatePhotoStatus = (hash: string, isLocal: boolean, isUploaded: boolean, pathToLocalImage?: string, photoId?: number) => {
  return { type: photoActionTypes.PHOTO_STATUS_UPDATE, payload: { hash, isLocal, isUploaded, pathToLocalImage, photoId } }
}

function startSaveAlbumsDB() {
  return { type: photoActionTypes.START_SAVE_ALBUMS };
}

function viewAlbumsDB() {
  return { type: photoActionTypes.VIEW_ALBUMS_DB };
}

export const photoActions = {
  startSync,
  stopSync,
  startSaveDB,
  viewDB,
  addPhotosToRender,
  updatePhotoStatusUpload,
  updatePhotoStatusDownload,
  updatePhotoStatusSelection,
  clearSelectedPhotos,
  updatePhotoStatus,
  clearPhotosToRender,
  startSaveAlbumsDB,
  viewAlbumsDB
}