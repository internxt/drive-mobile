//import { IPhoto, IFolder } from '../../components/PhotoList';
import { ImageOrVideo } from 'react-native-image-crop-picker';
import { IAlbum } from '../../components/AlbumList';
import { IPhoto } from '../../components/PhotoList';
import { photoActionTypes } from '../constants/photoActionTypes.constants';
import { ArraySortFunction } from '../services';
import { IPhotosToRender } from '../../screens/Photos';

export interface PhotosState {
  cursor: number
  loading: boolean
  loadingAlbums: boolean
  loadingPhotos: boolean
  loadingDeleted: boolean
  albums: any
  photosToRender: IPhotosToRender
  selectedPhotosForAlbum: ImageOrVideo[]
  isLoading: boolean
  devicePhotos: any
  deleted: any
  albumContent: any
  selectedPhoto: IPhoto | null
  selectedAlbum: IAlbum | null
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
  albumContent: [],
  selectedPhoto: null,
  selectedAlbum: null,
  selectedItems: [],
  sortType: 'Name',
  albumListSortType: 'Name',
  sortFunction: null,
  searchString: '',
  isUploading: false,
  isUploadingPhotoName: '',
  progress: 0,
  startDownloadSelectedPhoto: false,
  isSyncing: false
};

export function PhotosReducer(state = initialState, action: any): PhotosState {
  switch (action.type) {
  case photoActionTypes.SET_PHOTOS_TO_RENDER:
    return {
      ...state,
      photosToRender: action.payload
    }

  case photoActionTypes.PUSH_DOWNLOADED_PHOTO:
    return {
      ...state,
      photosToRender: { photos: [action.payload, ...state.photosToRender.photos], hasNextPage: state.photosToRender.hasNextPage }
    }

  case photoActionTypes.SET_SELECTED_PHOTOS:
    return {
      ...state,
      selectedPhotosForAlbum: action.payload
    }

  case photoActionTypes.UPDATE_CURSOR:
    return {
      ...state,
      cursor: action.payload
    };
  case photoActionTypes.SET_ALBUM_CONTENT:
    return {
      ...state,
      albumContent: action.payload
    };
  case photoActionTypes.GET_ALBUMS_SUCCESS:
    return {
      ...state,
      loadingAlbums: false,
      albums: action.payload,
      selectedPhoto: null,
      selectedItems: []
    };
  case photoActionTypes.GET_DELETE_SUCCESS:
    return {
      ...state,
      loadingDeleted: false,
      deleted: action.payload,
      selectedPhoto: null,
      selectedItems: []
    };
  case photoActionTypes.GET_DEVICE_SUCCESS:
    return {
      ...state,
      cursor: action.payload.index,
      devicePhotos: action.payload.photos
    };
  case photoActionTypes.GET_PHOTOS_REQUEST:
    return {
      ...state,
      loading: true
    };
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

  case photoActionTypes.ADD_PHOTO_REQUEST:
    return {
      ...state,
      loadingPhotos: true,
      isUploading: true,
      isUploadingPhotoName: action.payload
    };
  case photoActionTypes.ADD_PHOTO_SUCCESS:
    return {
      ...state,
      loadingPhotos: false,
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

  case photoActionTypes.CREATE_ALBUM_REQUEST:
    return {
      ...state,
      loading: true,
      albumContent: action.payload
    };

  case photoActionTypes.CREATE_ALBUM_SUCCESS:
    return {
      ...state,
      loading: false
    };

  case photoActionTypes.SELECT_PHOTO:
    // Check if Photo object is already on selection list
    const isAlreadySelected = state.selectedItems.filter((element: any) => {
      return action.payload.photoId === element.photoId
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
    return { ...state, loadingDeleted: true };

  case photoActionTypes.DELETE_PHOTO_SUCCESS:
    return {
      ...state,
      loadingDeleted: false
    };

  case photoActionTypes.DELETE_PHOTO_FAILURE:
    return { ...state, loadingDeleted: false };

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
  case photoActionTypes.SET_IS_LOADING:
    return {
      ...state,
      loading: action.payload
    }
  default:
    return state;
  }
}