//import { IPhoto, IFolder } from '../../components/PhotoList';
import { ImageOrVideo } from 'react-native-image-crop-picker';
import { IPhoto } from '../../components/PhotoList';
import { IPhotosToRender, IPhotoToRender, objectMap } from '../../screens/PhotoGallery';
import { photoActionTypes } from '../constants/photoActionTypes.constants';
import { ArraySortFunction } from '../services';

export interface PhotosState {
  cursor: number
  loading: boolean
  loadingAlbums: boolean
  loadingPhotos: boolean
  loadingDeleted: boolean
  albums: any,
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
  isSaveDB: boolean
  photosToRender: IPhotosToRender
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
  isSaveDB: false,
  photosToRender: {}
};

export function PhotosReducer(state = initialState, action: any): PhotosState {
  switch (action.type) {
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
    }

  case photoActionTypes.ADD_PHOTOS_TO_RENDER:
    return {
      ...state,
      photosToRender: { ...state.photosToRender, ...action.payload }
    }

  case photoActionTypes.PHOTO_UPLOAD_UPDATE:
    return {
      ...state,
      photosToRender: objectMap({ ...state.photosToRender }, (value: IPhotoToRender) => {
        if (value.hash === action.payload.hash) {
          return { ...value, isUploading: !action.payload.hasFinished }
        }
        return value
      })
    }

  case photoActionTypes.PHOTO_DOWNLOAD_UPDATE:
    return {
      ...state,
      photosToRender: objectMap({ ...state.photosToRender }, (value: IPhotoToRender) => {
        if (value.hash === action.payload.hash) {
          return { ...value, isDownloading: !action.payload.hasFinished }
        }
        return value
      })
    }

  case photoActionTypes.PHOTO_STATUS_UPDATE:
    return {
      ...state,
      photosToRender: objectMap({ ...state.photosToRender }, (value: IPhotoToRender) => {
        if (value.hash === action.payload.hash) {
          return {
            ...value,
            isLocal: action.payload.isLocal,
            isUploaded: action.payload.isUploaded,
            localUri: action.payload.pathToLocalImage ? action.payload.pathToLocalImage : value.localUri
          }
        }
        return value
      })
    }

  default:
    return state;
  }
}