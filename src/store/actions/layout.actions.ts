import { AnyAction } from 'redux';
import { layoutActionTypes } from '../constants';

export const layoutActions = {
  openSearch,
  closeSearch,
  openSettings,
  closeSettings,
  openItemModal,
  closeItemModal,
  openAddItemModal,
  closeAddItemModal,
  openRanOutStorageModal,
  closeRanOutStorageModal,
  openSortModal,
  closeSortModal,
  openMoveFilesModal,
  closeMoveFilesModal,
  openDeleteModal,
  closeDeleteModal,
  openShareModal,
  closeShareModal,
  openComingSoonModal,
  closeComingSoonModal,
  openUploadFileModal,
  closeUploadFileModal,
  openCreateFolderModal,
  closeCreateFolderModal,
  enableBackButton,
  disableBackButton,
  openRenameModal,
  closeRenameModal,
  switchFileViewMode,
};

function openSearch(): AnyAction {
  return { type: layoutActionTypes.OPEN_SEARCH_FORM };
}

function closeSearch(): AnyAction {
  return { type: layoutActionTypes.CLOSE_SEARCH_FORM };
}

function openSettings(): AnyAction {
  return { type: layoutActionTypes.OPEN_SETTINGS_MODAL };
}

function closeSettings(): AnyAction {
  return { type: layoutActionTypes.CLOSE_SETTINGS_MODAL };
}

function openItemModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_ITEM_MODAL };
}

function closeItemModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_ITEM_MODAL };
}

function openAddItemModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_ADD_ITEM_MODAL };
}

function closeAddItemModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_ADD_ITEM_MODAL };
}

function openRanOutStorageModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_RANOUTSTORAGE_MODAL };
}

function closeRanOutStorageModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_RANOUTSTORAGE_MODAL };
}

function openSortModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_SORT_MODAL };
}

function closeSortModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_SORT_MODAL };
}

function openMoveFilesModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_MOVEFILES_MODAL };
}

function closeMoveFilesModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_MOVEFILES_MODAL };
}

function openDeleteModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_DELETE_MODAL };
}

function closeDeleteModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_DELETE_MODAL };
}

function openShareModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_SHARE_MODAL };
}

function closeShareModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_SHARE_MODAL };
}

function openUploadFileModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_UPLOAD_FILE_MODAL };
}

function closeUploadFileModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_UPLOAD_FILE_MODAL };
}

function openComingSoonModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_COMING_SOON_MODAL };
}

function closeComingSoonModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_COMING_SOON_MODAL };
}

function openCreateFolderModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_CREATE_FOLDER_MODAL };
}

function closeCreateFolderModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_CREATE_FOLDER_MODAL };
}

function enableBackButton(): AnyAction {
  return { type: layoutActionTypes.ENABLE_BACK_BUTTON };
}

function disableBackButton(): AnyAction {
  return { type: layoutActionTypes.DISABLE_BACK_BUTTON };
}

function openRenameModal(): AnyAction {
  return { type: layoutActionTypes.OPEN_RENAME_MODAL };
}

function closeRenameModal(): AnyAction {
  return { type: layoutActionTypes.CLOSE_RENAME_MODAL };
}

function switchFileViewMode(): AnyAction {
  return { type: layoutActionTypes.SWITCH_FILE_VIEW_MODEL };
}
