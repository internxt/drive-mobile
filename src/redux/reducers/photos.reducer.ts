import { IPhotosToRender, IPhotoToRender, objectMap } from '../../screens/PhotoGallery';
import { photoActionTypes } from '../constants/photoActionTypes.constants';

export interface PhotosState {
  isSyncing: boolean
  isSaveDB: boolean
  photosToRender: IPhotosToRender
}

const initialState: PhotosState = {
  isSyncing: false,
  isSaveDB: false,
  photosToRender: {}
};

export function PhotosReducer(state = initialState, action: any): PhotosState {
  switch (action.type) {
  case photoActionTypes.START_SYNC:
    return {
      ...state,
      isSyncing: true
    };
  case photoActionTypes.STOP_SYNC:
    return {
      ...state,
      isSyncing: false
    };
  case photoActionTypes.START_SAVE_DB:
    return {
      ...state,
      isSaveDB: true
    };
  case photoActionTypes.VIEW_DB:
    return {
      ...state,
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

  case photoActionTypes.PHOTO_SELECTION_UPDATE:
    return {
      ...state,
      photosToRender: objectMap({ ...state.photosToRender }, (value: IPhotoToRender) => {
        if (value.hash === action.payload.hash) {
          return { ...value, isSelected: !value.isSelected }
        }
        return value
      })
    }

  case photoActionTypes.PHOTO_SELECTION_CLEAR:
    return {
      ...state,
      photosToRender: objectMap({ ...state.photosToRender }, (value: IPhotoToRender) => value.isSelected ? ({ ...value, isSelected: false }) : value)
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
            localUri: action.payload.pathToLocalImage || value.localUri,
            photoId: action.payload.photoId || value.photoId
          }
        }
        return value
      })
    }

  case photoActionTypes.CLEAR_PHOTOS_TO_RENDER:
    return {
      ...state,
      photosToRender: {}
    };

  default:
    return state;
  }
}