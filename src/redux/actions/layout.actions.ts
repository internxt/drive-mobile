import { Dispatch } from 'redux';
import { layoutActionTypes, fileActionTypes } from '../constants';

export const layoutActions = {
  openSearch,
  closeSearch,
  openSettings,
  closeSettings,
  openItemModal,
  closeItemModal,
  openAlbumModal,
  closeAlbumModal,
  openAddItemModal,
  closeAddItemModal,
  openSelectPhotoModal,
  closeSelectPhotoModal,
  openRunOutStorageModal,
  closeRunOutStorageModal,
  openFreeForYouModal,
  closeFreeForYouModal,
  openSortModal,
  closeSortModal,
  openMoveFilesModal,
  closeMoveFilesModal,
  openDeleteModal,
  closeDeleteModal,
  openShareModal,
  closeShareModal,
  openUploadFileModal,
  closeUploadFileModal
};

function openSearch() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_SEARCH_FORM });
  };
}

function closeSearch() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_SEARCH_FORM });
  };
}

function openSettings() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_SETTINGS_MODAL });
  };
}

function closeSettings() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_SETTINGS_MODAL });
  };
}

function openItemModal(item: any) {
  return (dispatch: Dispatch) => {
    if (item) {
      dispatch({ type: fileActionTypes.SELECT_FILE, payload: item });
    }
    dispatch({ type: layoutActionTypes.OPEN_ITEM_MODAL, payload: item });
  };
}

function closeItemModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_ITEM_MODAL });
  };
}

function openAlbumModal() {
  return (dispatch: Dispatch) => {
    
    dispatch({ type: layoutActionTypes.OPEN_ALBUM_MODAL});
  };
}

function closeAlbumModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_ALBUM_MODAL });
  };
}

function openAddItemModal() {
  return (dispatch: Dispatch) => {
    
    dispatch({ type: layoutActionTypes.OPEN_ADD_ITEM_MODAL});
  };
}

function closeAddItemModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_ADD_ITEM_MODAL });
  };
}

function openSelectPhotoModal() {
  return (dispatch: Dispatch) => {
    
    dispatch({ type: layoutActionTypes.OPEN_SELECT_PHOTO_MODAL});
  };
}

function closeSelectPhotoModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_SELECT_PHOTO_MODAL });
  };
}

function openRunOutStorageModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_RUNOUTSTORAGE_MODAL });
  };
}

function openFreeForYouModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_FREEFORYOU_MODAL });
  };
}

function closeFreeForYouModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_FREEFORYOU_MODAL });
  };
}

function closeRunOutStorageModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_RUNOUTSTORAGE_MODAL });
  };
}

function openSortModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_SORT_MODAL });
  };
}

function closeSortModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_SORT_MODAL });
  };
}

function openMoveFilesModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_MOVEFILES_MODAL });
  };
}

function closeMoveFilesModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_MOVEFILES_MODAL });
  };
}

function openDeleteModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_DELETE_MODAL });
  };
}

function closeDeleteModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_DELETE_MODAL });
  };
}

function openShareModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_SHARE_MODAL });
  };
}

function closeShareModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_SHARE_MODAL });
  };
}

function openUploadFileModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.OPEN_UPLOAD_FILE_MODAL });
  };
}

function closeUploadFileModal() {
  return (dispatch: Dispatch) => {
    dispatch({ type: layoutActionTypes.CLOSE_UPLOAD_FILE_MODAL });
  };
}