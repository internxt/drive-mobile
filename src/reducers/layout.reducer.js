import { layoutActionTypes } from "../constants";

const initialState = {
  searchActive: false,
  createFolderActive: false
};

export function layoutReducer(state = initialState, action) {
  switch (action.type) {
    case layoutActionTypes.OPEN_CREATE_FOLDER_FORM:
      return {
        searchActive: false,
        createFolderActive: true
      };
    case layoutActionTypes.CLOSE_CREATE_FOLDER_FORM:
      return {
        ...state,
        createFolderActive: false
      };
    case layoutActionTypes.OPEN_SEARCH_FORM:
      return {
        createFolderActive: false,
        searchActive: true
      };
    case layoutActionTypes.CLOSE_SEARCH_FORM:
      return {
        ...state,
        searchActive: false
      };
    default:
      return state;
  }
}
