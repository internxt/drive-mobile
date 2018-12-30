import { fileActionTypes } from "../constants";

const initialState = {
  loading: false,
  items: [],
  folderContent: null,
  selectedFile: null
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
    default:
      return state;
  }
}
