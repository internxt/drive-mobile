import { fileActionTypes } from "../constants";

const initialState = {
  loading: false,
  items: [],
  currentDir: null
};

export function files(state = initialState, action) {
  switch (action.type) {
    case fileActionTypes.GET_FILES_REQUEST:
      return {
        loading: true,
        ...state
      };
    case fileActionTypes.GET_FILES_SUCCESS:
      return {
        loading: false,
        items: action.payload.items,
        currentDir: action.payload.currentDirId
      };
    case fileActionTypes.GET_FILES_FAILURE:
      return {
        loading: false,
        error: action.error,
        ...state
      };

    case fileActionTypes.CREATE_FOLDER_REQUEST:
      return {
        loading: true,
        ...state
      };
    case fileActionTypes.CREATE_FOLDER_SUCCESS:
      return {
        loading: false,
        items: action.payload.items,
        currentDir: action.payload.currentDirId
      };
    case fileActionTypes.CREATE_FOLDER_FAILURE:
      return {
        loading: false,
        error: action.error,
        ...state
      };
    default:
      return state;
  }
}
