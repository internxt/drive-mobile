import { fileActionTypes } from "../constants";

const initialState = {
  loading: false,
  items: [],
  folderContent: null,
  selectedFile: null,
  sortType: '',
  sortFunction: null,
  searchString: '',
  isUploading: false,
  isUploadingFileName: '',
  startDownloadSelectedFile: false
};

export function filesReducer(state = initialState, action) {
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
        selectedFile: null
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
    case fileActionTypes.ADD_FILE_SUCCESS:
      return {
        ...state,
        loading: false,
        isUploading: false
      };

    case fileActionTypes.ADD_FILE_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.error,
        isUploading: false
      };

    case fileActionTypes.SELECT_FILE:
      return {
        ...state,
        selectedFile: action.payload
      };

    case fileActionTypes.DESELECT_ALL:
      return {
        ...state,
        selectedFile: null
      };

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
        folderContent: action.payload,
        selectedFile: null
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
      return { ...state, startDownloadSelectedFile: true };
    case fileActionTypes.DOWNLOAD_SELECTED_FILE_STOP:
      return { ...state, startDownloadSelectedFile: false };
    default:
      return state;
  }
}
