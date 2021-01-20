//import { IPhoto, IFolder } from '../../components/PhotoList';
import { photoActionTypes } from '../constants/photoActionTypes.constants';
import { ArraySortFunction } from '../services';

export interface PhotosState {
  cursor: number
  loading: boolean
  photos: any[]
  folderContent: any
  rootFolderContent: any
  selectedPhoto: IPhoto | null
  selectedAlbum: IAlbum | null
  selectedItems: any[]
  sortType: string
  sortFunction: ArraySortFunction | null
  searchString: string
  isUploading: boolean
  isUploadingPhotoName: string | null
  progress: number
  startDownloadSelectedPhoto: boolean
  error?: string | null
}

const initialState: PhotosState = {
  cursor: 0,
  loading: false,
  photos: [],
  folderContent: null,
  rootFolderContent: null,
  selectedPhoto: null,
  selectedAlbum: null,
  selectedItems: [],
  sortType: '',
  sortFunction: null,
  searchString: '',
  isUploading: false,
  isUploadingPhotoName: '',
  progress: 0,
  startDownloadSelectedPhoto: false
};

export function PhotosReducer(state = initialState, action: any): PhotosState {
  switch (action.type) {
    case photoActionTypes.UPDATE_CURSOR:
        return {
            ...state,
            cursor: action.payload
        };
    case photoActionTypes.SET_FOLDER_CONTENT:
        return {
          ...state,
          loading: false,
          photos: action.payload
        };
  case photoActionTypes.GET_PHOTOS_REQUEST:
    return {
      ...state,
      loading: true
    };
  case photoActionTypes.GET_PHOTOS_SUCCESS:
    return {
      ...state,
      loading: false,
      folderContent: action.payload,
      selectedPhoto: null,
      selectedItems: []
    };
  case photoActionTypes.GET_PHOTOS_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.error
    };
  case photoActionTypes.ADD_PHOTO_REQUEST:
    return {
      ...state,
      loading: true,
      isUploading: true,
      isUploadingPhotoName: action.payload
    };
  case photoActionTypes.ADD_PHOTO_SUCCESS:
    return {
      ...state,
      loading: false,
      isUploading: false,
      isUploadingPhotoName: null
    };

  case photoActionTypes.ADD_PHOTO_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.error,
      isUploading: false
    };

  case photoActionTypes.ADD_PHOTO_UPLOAD_PROGRESS:
    return {
      ...state,
      progress: action.payload
    };

  case photoActionTypes.SELECT_PHOTO:
    // Check if Photo object is already on selection list
    const isAlreadySelected = state.selectedItems.filter((element: any) => {
      const elementIsFolder = !(element.PhotoId);

      return elementIsFolder ? action.payload.id === element.id : action.payload.PhotoId === element.PhotoId
    }).length > 0;

    return {
      ...state,
      selectedPhoto: action.payload,
      selectedItems: isAlreadySelected ? state.selectedItems : [...state.selectedItems, action.payload]
    };

  case photoActionTypes.DESELECT_PHOTO:
    const removedItem = state.selectedItems.filter((element: any) => {
      const elementIsFolder = !(element.PhotoId);

      return elementIsFolder ? action.payload.id !== element.id : action.payload.PhotoId !== element.PhotoId;
    });

    return {
      ...state,
      selectedItems: removedItem
    }

  case photoActionTypes.DESELECT_ALL:
    return {
      ...state,
      selectedPhoto: null,
      selectedItems: []
    };

  case photoActionTypes.DELETE_PHOTO_REQUEST:
    return { ...state, loading: true };

  case photoActionTypes.DELETE_PHOTO_SUCCESS:
    return { ...state, loading: false };

  case photoActionTypes.DELETE_PHOTO_FAILURE:
    return { ...state, loading: false };

  case photoActionTypes.SET_SORT_TYPE:
    return {
      ...state,
      sortType: action.payload[0],
      sortFunction: action.payload[1]
    };

  case photoActionTypes.SET_SEARCH_STRING:
    return {
      ...state,
      searchString: action.payload
    }

  case photoActionTypes.CREATE_ALBUM_REQUEST:
    return {
      ...state,
      loading: true
    };

  case photoActionTypes.CREATE_ALBUM_SUCCESS:
    return {
      ...state,
      loading: false,
      selectedPhoto: null,
      selectedItems: []
    };
  case photoActionTypes.CREATE_ALBUM_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.payload
    };
  case photoActionTypes.UPDATE_ALBUM_METADATA_REQUEST:
    return {
      ...state,
      loading: true
    }
  case photoActionTypes.UPDATE_ALBUM_METADATA_SUCCESS:
    return {
      ...state,
      loading: false
    }
  case photoActionTypes.UPDATE_ALBUM_METADATA_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  case photoActionTypes.DOWNLOAD_SELECTED_PHOTO_START:
    return {
      ...state,
      startDownloadSelectedPhoto: true
    }
  case photoActionTypes.DOWNLOAD_SELECTED_PHOTO_STOP:
    return {
      ...state,
      startDownloadSelectedPhoto: false
    }
  case photoActionTypes.MOVE_PHOTOS_REQUEST:
    return {
      ...state,
      loading: true
    }
  case photoActionTypes.MOVE_PHOTOS_SUCCESS:
    return {
      ...state,
      loading: false
    }
  case photoActionTypes.MOVE_PHOTOS_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  case photoActionTypes.SET_ROOTFOLDER_CONTENT:
    return {
      ...state,
      rootFolderContent: action.payload
    }
  default:
    return state;
  }
}