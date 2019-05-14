import { layoutActionTypes } from "../constants";

export const layoutActions = {
  openSearch,
  closeSearch,
  openSettings,
  closeSettings,
  openFolderModal,
  closeFolderModal
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

function openSettings() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_SETTINGS_MODAL });
  }
}

function closeSettings() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_SETTINGS_MODAL });
  }
}

function openFolderModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_FOLDER_MODAL });
  }
}

function closeFolderModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_FOLDER_MODAL });
  }
}