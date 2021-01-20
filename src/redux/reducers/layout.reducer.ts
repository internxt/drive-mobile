import { layoutActionTypes } from '../constants';

export interface LayoutState {
  searchActive: boolean
  createFolderActive: boolean
  showSettingsModal: boolean
  showItemModal: boolean
  showAlbumModal: boolean
  showAddItemModal: boolean
  showSelectPhotoModal: boolean
  showSortModal: boolean
  showMoveModal: boolean
  showDeleteModal: boolean
  showShareModal: boolean
  showUploadModal: boolean
}

const initialState: LayoutState = {
  searchActive: false,
  createFolderActive: false,
  showSettingsModal: false,
  showItemModal: false,
  showAlbumModal: false,
  showAddItemModal: false,
  showSelectPhotoModal: false,
  showSortModal: false,
  showMoveModal: false,
  showDeleteModal: false,
  showShareModal: false,
  showUploadModal: false
};

export function layoutReducer(state = initialState, action: any) {
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
        ...state,
        searchActive: true
      };
    case layoutActionTypes.CLOSE_SEARCH_FORM:
      return {
        ...state,
        searchActive: false
      };
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
    case layoutActionTypes.OPEN_ALBUM_MODAL:
      return {
        ...state,
        showAlbumModal: true
      }
    case layoutActionTypes.CLOSE_ALBUM_MODAL:
      return {
        ...state,
        showAlbumModal: false
      }
      case layoutActionTypes.OPEN_ADD_ITEM_MODAL:
      return {
        ...state,
        showAddItemModal: true
      }
    case layoutActionTypes.CLOSE_ADD_ITEM_MODAL:
      return {
        ...state,
        showAddItemModal: false
      }
      case layoutActionTypes.OPEN_SELECT_PHOTO_MODAL: {
        return {
          ...state,
          showSelectPhotoModal: true
        }
      }
      case layoutActionTypes.CLOSE_SELECT_PHOTO_MODAL: {
        return {
          ...state,
          showSelectPhotoModal: false
        }
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
    default:
      return state;
  }
}