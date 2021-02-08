import { IFile, IFolder, IUploadingFile } from '../../components/FileList';
import { fileActionTypes } from '../constants';
import { ArraySortFunction } from '../services';

export interface FilesState {
  loading: boolean
  items: any[]
  filesCurrentlyUploading: IUploadingFile[]
  filesAlreadyUploaded: any[]
  folderContent: any
  rootFolderContent: any
  selectedFile: IFile & IFolder | null
  selectedItems: any[]
  sortType: string
  sortFunction: ArraySortFunction | null
  searchString: string
  isUploading: boolean
  isUploadingFileName: string | null
  uploadFileUri: string | undefined | null
  progress: number
  startDownloadSelectedFile: boolean
  error?: string | null
  uri: string | Record<string, string> | undefined | null
}

const initialState: FilesState = {
  loading: false,
  items: [],
  filesCurrentlyUploading: [],
  filesAlreadyUploaded: [],
  folderContent: null,
  rootFolderContent: null,
  selectedFile: null,
  selectedItems: [],
  sortType: '',
  sortFunction: null,
  searchString: '',
  isUploading: false,
  isUploadingFileName: '',
  uploadFileUri: '',
  progress: 0,
  startDownloadSelectedFile: false,
  uri: undefined
};

export function filesReducer(state = initialState, action: any): FilesState {
  switch (action.type) {
  case fileActionTypes.GET_FILES_REQUEST:
    return {
      ...state,
      loading: true
    };
  case fileActionTypes.GET_FILES_SUCCESS:
    return {
      ...state,
      loading: false,
      folderContent: action.payload,
      selectedFile: null,
      selectedItems: []
    };
  case fileActionTypes.GET_FILES_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.error
    };
  case fileActionTypes.ADD_FILE_REQUEST:
    return {
      ...state,
      loading: true,
      isUploading: true,
      isUploadingFileName: action.payload
    };
  case fileActionTypes.ADD_UPLOADING_FILE:
    return {
      ...state,
      filesCurrentlyUploading: [...state.filesCurrentlyUploading, action.payload]
    };
  case fileActionTypes.REMOVE_UPLOADING_FILE:
    return {
      ...state,
      filesAlreadyUploaded: [...state.filesAlreadyUploaded, state.filesCurrentlyUploading.find(file => file.id === action.payload)],
      filesCurrentlyUploading: state.filesCurrentlyUploading.filter(file => file.id !== action.payload)
    };
  case fileActionTypes.ADD_FILE_SUCCESS:
    return {
      ...state,
      loading: false,
      isUploading: false,
      isUploadingFileName: null,
      filesCurrentlyUploading: state.filesCurrentlyUploading.filter(file => file.name !== action.payload),
      filesAlreadyUploaded: state.filesAlreadyUploaded.filter(file => file.name !== action.payload)
    };

  case fileActionTypes.ADD_FILE_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.error,
      isUploading: false
    };

  case fileActionTypes.ADD_FILE_UPLOAD_PROGRESS:
    if (state.filesCurrentlyUploading.length > 0) {
      const index = state.filesCurrentlyUploading.findIndex(x => x.id === action.payload.id);

      if (state.filesCurrentlyUploading[index]) {
        state.filesCurrentlyUploading[index].progress = action.payload.progress
      }
    }

    return {
      ...state
    };

  case fileActionTypes.SET_FILE_UPLOAD_URI:
    return {
      ...state,
      uploadFileUri: action.payload
    };

  case fileActionTypes.SELECT_FILE:
    // Check if file object is already on selection list
    const isAlreadySelected = state.selectedItems.filter((element: any) => {
      const elementIsFolder = !(element.fileId);

      return elementIsFolder ? action.payload.id === element.id : action.payload.fileId === element.fileId
    }).length > 0;

    return {
      ...state,
      selectedFile: action.payload,
      selectedItems: isAlreadySelected ? state.selectedItems : [...state.selectedItems, action.payload]
    };

  case fileActionTypes.DESELECT_FILE:
    const removedItem = state.selectedItems.filter((element: any) => {
      const elementIsFolder = !(element.fileId);

      return elementIsFolder ? action.payload.id !== element.id : action.payload.fileId !== element.fileId;
    });

    return {
      ...state,
      selectedItems: removedItem
    }

  case fileActionTypes.DESELECT_ALL:
    return {
      ...state,
      selectedFile: null,
      selectedItems: []
    };

  case fileActionTypes.DELETE_FILE_REQUEST:
    return { ...state, loading: true };

  case fileActionTypes.DELETE_FILE_SUCCESS:
    return { ...state, loading: false };

  case fileActionTypes.DELETE_FILE_FAILURE:
    return { ...state, loading: false };

  case fileActionTypes.SET_SORT_TYPE:
    return {
      ...state,
      sortType: action.payload[0],
      sortFunction: action.payload[1]
    };

  case fileActionTypes.SET_SEARCH_STRING:
    return {
      ...state,
      searchString: action.payload
    }

  case fileActionTypes.CREATE_FOLDER_REQUEST:
    return {
      ...state,
      loading: true
    };

  case fileActionTypes.CREATE_FOLDER_SUCCESS:
    return {
      ...state,
      loading: false,
      selectedFile: null,
      selectedItems: []
    };
  case fileActionTypes.CREATE_FOLDER_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.payload
    };
  case fileActionTypes.UPDATE_FOLDER_METADATA_REQUEST:
    return {
      ...state,
      loading: true
    }
  case fileActionTypes.UPDATE_FOLDER_METADATA_SUCCESS:
    return {
      ...state,
      loading: false
    }
  case fileActionTypes.UPDATE_FOLDER_METADATA_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  case fileActionTypes.DOWNLOAD_SELECTED_FILE_START:
    return {
      ...state,
      startDownloadSelectedFile: true
    }
  case fileActionTypes.DOWNLOAD_SELECTED_FILE_STOP:
    return {
      ...state,
      startDownloadSelectedFile: false
    }
  case fileActionTypes.MOVE_FILES_REQUEST:
    return {
      ...state,
      loading: true
    }
  case fileActionTypes.MOVE_FILES_SUCCESS:
    return {
      ...state,
      loading: false
    }
  case fileActionTypes.MOVE_FILES_FAILURE:
    return {
      ...state,
      loading: false,
      error: action.payload
    }
  case fileActionTypes.SET_ROOTFOLDER_CONTENT:
    return {
      ...state,
      rootFolderContent: action.payload
    }
  case fileActionTypes.SET_URI:
    return {
      ...state,
      uri: action.payload
    }
  default:
    return state;
  }
}