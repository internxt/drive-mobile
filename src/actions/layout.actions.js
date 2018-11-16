import { layoutActionTypes } from "../constants";

export const layoutActions = {
  openSearch,
  closeSearch,
  openCreateNewFolder,
  closeCreateNewFolder
};

function openSearch() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_SEARCH_FORM });
  };
}

function closeSearch() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_SEARCH_FORM });
  };
}

function openCreateNewFolder() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_CREATE_FOLDER_FORM });
  };
}

function closeCreateNewFolder() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_CREATE_FOLDER_FORM });
  };
}
