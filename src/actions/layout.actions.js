import { layoutActionTypes } from "../constants";

export const layoutActions = {
  openSearch,
  closeSearch,
  openSettings,
  closeSettings,
  openFolderModal,
  closeFolderModal,
  openFileModal,
  closeFileModal,
  openRunOutStorageModal,
  closeRunOutStorageModal,
  openSortModal,
  closeSortModal
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

function openFileModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_FILE_MODAL });
  }
}

function closeFileModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_FILE_MODAL });
  }
}

function openRunOutStorageModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_RUNOUTSTORAGE_MODAL });
  }
}

function closeRunOutStorageModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_RUNOUTSTORAGE_MODAL });
  }
}

function openSortModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_SORT_MODAL });
  }
}

function closeSortModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_SORT_MODAL });
  }
}
