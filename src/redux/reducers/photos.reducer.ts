//import { IPhoto, IFolder } from '../../components/PhotoList';
import { ImageOrVideo } from 'react-native-image-crop-picker';
import { IPhoto } from '../../components/PhotoList';
import { photoActionTypes } from '../constants/photoActionTypes.constants';
import { ArraySortFunction } from '../services';
import { IHashedPhoto } from '../../screens/PhotoGallery/init';
import { IPhotosToRender } from '../../screens/PhotoGallery';

export interface PhotosState {
  cursor: number
  loading: boolean
  loadingAlbums: boolean
  loadingPhotos: boolean
  loadingDeleted: boolean
  albums: any,
  photosToRender: IPhotosToRender
  currentlyUploadingPhotos: IHashedPhoto[]
  currentlyDownloadingPhotos: IHashedPhoto[]
  selectedPhotosForAlbum: ImageOrVideo[]
  isLoading: boolean
  devicePhotos: any
  deleted: any
  albumContent: any
  selectedPhoto: IPhoto | null
  selectedItems: any
  sortType: string
  albumListSortType: string
  sortFunction: ArraySortFunction | null
  searchString: string
  isUploading: boolean
  isUploadingPhotoName: string | null
  progress: number
  startDownloadSelectedPhoto: boolean
  error?: string | null
  isSyncing: boolean
  isSaveDB: boolean,
}

const initialState: PhotosState = {
  cursor: 0,
  loading: false,
  loadingAlbums: true,
  loadingPhotos: true,
  loadingDeleted: true,
  selectedPhotosForAlbum: [],
  isLoading: true,
  devicePhotos: [],
  deleted: [],
  albums: [],
  photosToRender: { photos: [], hasNextPage: true },
  currentlyUploadingPhotos: [],
  currentlyDownloadingPhotos: [],
  albumContent: [],
  selectedPhoto: null,
  selectedItems: [],
  sortType: 'all',
  albumListSortType: 'Name',
  sortFunction: null,
  searchString: '',
  isUploading: false,
  isUploadingPhotoName: '',
  progress: 0,
  startDownloadSelectedPhoto: false,
  isSyncing: false,
  isSaveDB: false
};

export function PhotosReducer(state = initialState, action: any): PhotosState {
  switch (action.type) {
  case photoActionTypes.SET_PHOTOS_TO_RENDER:
    return {
      ...state,
      photosToRender: action.payload
    }

  case photoActionTypes.START_PHOTO_UPLOAD:
    return {
      ...state,
      currentlyUploadingPhotos: [...state.currentlyUploadingPhotos, action.payload]
    }
  case photoActionTypes.STOP_PHOTO_UPLOAD:
    return {
      ...state,
      currentlyUploadingPhotos: [...state.currentlyDownloadingPhotos.filter(photo => photo.hash !== action.payload)],
      photosToRender: {
        photos: [...state.photosToRender.photos.map(photo => photo.hash === action.payload ? ({ ...photo, isUploading: false }) : photo)],
        hasNextPage: state.photosToRender.hasNextPage
      }
    }

  case photoActionTypes.START_PHOTO_DOWNLOAD:
    return {
      ...state,
      currentlyDownloadingPhotos: [...state.currentlyDownloadingPhotos, action.payload]
    }
  case photoActionTypes.STOP_PHOTO_DOWNLOAD:
    const downloadingPhotos = state.currentlyDownloadingPhotos.filter(photo => photo.hash !== action.payload)

    return {
      ...state,
      currentlyDownloadingPhotos: downloadingPhotos
    }

  case photoActionTypes.PUSH_DOWNLOADED_PHOTO:
    return {
      ...state,
      photosToRender: { photos: [action.payload, ...state.photosToRender.photos], hasNextPage: state.photosToRender.hasNextPage }
    }
  case photoActionTypes.START_SYNC:
    return {
      ...state,
      loading: true,
      isSyncing: true
    };
  case photoActionTypes.STOP_SYNC:
    return {
      ...state,
      loading: false,
      isSyncing: false
    };
  case photoActionTypes.START_SAVE_DB:
    return {
      ...state,
      loading: true,
      isSaveDB: true
    };
  case photoActionTypes.VIEW_DB:
    return {
      ...state,
      loading: true,
      isSaveDB: false
    };

  default:
    return state;
  }
}