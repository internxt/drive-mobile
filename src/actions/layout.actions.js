import { layoutActionTypes, fileActionTypes } from "../constants";

export const layoutActions = {
  openSearch,
  closeSearch,
  openSettings,
  closeSettings,
  openItemModal,
  closeItemModal,
  openRunOutStorageModal,
  closeRunOutStorageModal,
  openSortModal,
  closeSortModal,
  openMoveFilesModal,
  closeMoveFilesModal
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

function openItemModal(item) {
  return dispatch => {
    if (item) { dispatch({ type: fileActionTypes.SELECT_FILE, payload: item}); }
    dispatch({ type: layoutActionTypes.OPEN_ITEM_MODAL });
  }
}

function closeItemModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_ITEM_MODAL });
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

function openMoveFilesModal() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_MOVEFILES_MODAL });
  }
}

function closeMoveFilesModal() { 
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_MOVEFILES_MODAL });
  }
}
