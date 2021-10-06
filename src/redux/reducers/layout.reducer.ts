import { AnyAction } from 'redux';
import { layoutActionTypes } from '../constants';

export interface LayoutState {
  searchActive: boolean
  createFolderActive: boolean
  showSettingsModal: boolean
  showItemModal: boolean
  showAddItemModal: boolean
  showSortModal: boolean
  showMoveModal: boolean
  showDeleteModal: boolean
  showShareModal: boolean
  showFreeForYouModal: boolean
  showComingSoonModal: boolean
  showUploadModal: boolean
  showCreateFolderModal: boolean
  backButtonEnabled: boolean
  showRenameModal: boolean
  showRunOutOfSpaceModal: boolean
}

const initialState: LayoutState = {
  searchActive: false,
  createFolderActive: false,
  showSettingsModal: false,
  showItemModal: false,
  showAddItemModal: false,
  showSortModal: false,
  showMoveModal: false,
  showDeleteModal: false,
  showShareModal: false,
  showFreeForYouModal: false,
  showComingSoonModal: false,
  showUploadModal: false,
  showCreateFolderModal: false,
  backButtonEnabled: true,
  showRenameModal: false,
  showRunOutOfSpaceModal: false
};

export function layoutReducer(state = initialState, action: AnyAction): LayoutState {
  switch (action.type) {
  case layoutActionTypes.OPEN_SEARCH_FORM:
    return {
      ...state,
      searchActive: true
    }
  case layoutActionTypes.CLOSE_SEARCH_FORM:
    return {
      ...state,
      searchActive: false
    }
  case layoutActionTypes.OPEN_SETTINGS_MODAL:
    return {
      ...state,
      showSettingsModal: true
    }
  case layoutActionTypes.CLOSE_SETTINGS_MODAL:
    return {
      ...state,
      showSettingsModal: false
    }
  case layoutActionTypes.OPEN_ITEM_MODAL:
    return {
      ...state,
      showItemModal: true
    }
  case layoutActionTypes.CLOSE_ITEM_MODAL:
    return {
      ...state,
      showItemModal: false
    }
  case layoutActionTypes.OPEN_SORT_MODAL: {
    return {
      ...state,
      showSortModal: true
    }
  }
  case layoutActionTypes.CLOSE_SORT_MODAL: {
    return {
      ...state,
      showSortModal: false
    }
  }
  case layoutActionTypes.OPEN_MOVEFILES_MODAL: {
    return {
      ...state,
      showMoveModal: true
    }
  }
  case layoutActionTypes.CLOSE_MOVEFILES_MODAL: {
    return {
      ...state,
      showMoveModal: false
    }
  }
  case layoutActionTypes.OPEN_DELETE_MODAL: {
    return {
      ...state,
      showDeleteModal: true
    }
  }
  case layoutActionTypes.CLOSE_DELETE_MODAL: {
    return {
      ...state,
      showDeleteModal: false
    }
  }
  case layoutActionTypes.OPEN_SHARE_MODAL: {
    return {
      ...state,
      showShareModal: true
    }
  }
  case layoutActionTypes.CLOSE_SHARE_MODAL: {
    return {
      ...state,
      showShareModal: false
    }
  }
  case layoutActionTypes.OPEN_UPLOAD_FILE_MODAL: {
    return {
      ...state,
      showUploadModal: true
    }
  }
  case layoutActionTypes.CLOSE_UPLOAD_FILE_MODAL: {
    return {
      ...state,
      showUploadModal: false
    }
  }

  case layoutActionTypes.OPEN_FREEFORYOU_MODAL: {
    return {
      ...state,
      showFreeForYouModal: true
    }
  }
  case layoutActionTypes.CLOSE_FREEFORYOU_MODAL: {
    return {
      ...state,
      showFreeForYouModal: false
    }
  }
  case layoutActionTypes.OPEN_COMING_SOON_MODAL: {
    return {
      ...state,
      showComingSoonModal: true
    }
  }
  case layoutActionTypes.CLOSE_COMING_SOON_MODAL: {
    return {
      ...state,
      showComingSoonModal: false
    }
  }
  case layoutActionTypes.OPEN_CREATE_FOLDER_MODAL: {
    return {
      ...state,
      showCreateFolderModal: true
    }
  }
  case layoutActionTypes.CLOSE_CREATE_FOLDER_MODAL: {
    return {
      ...state,
      showCreateFolderModal: false
    }
  }
  case layoutActionTypes.ENABLE_BACK_BUTTON: {
    return {
      ...state,
      backButtonEnabled: true
    }
  }
  case layoutActionTypes.DISABLE_BACK_BUTTON: {
    return {
      ...state,
      backButtonEnabled: false
    }
  }
  case layoutActionTypes.OPEN_RENAME_MODAL: {
    return {
      ...state,
      showRenameModal: true
    }
  }
  case layoutActionTypes.CLOSE_RENAME_MODAL: {
    return {
      ...state,
      showRenameModal: false
    }
  }
  case layoutActionTypes.OPEN_RANOUTSTORAGE_MODAL: {
    return {
      ...state,
      showRunOutOfSpaceModal: true
    }
  }
  case layoutActionTypes.CLOSE_RANOUTSTORAGE_MODAL: {
    return {
      ...state,
      showRunOutOfSpaceModal: false
    }
  }
  default:
    return state;
  }
}