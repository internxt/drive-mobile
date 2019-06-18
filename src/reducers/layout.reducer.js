import { layoutActionTypes } from "../constants";

const initialState = {
  searchActive: false,
  createFolderActive: false,
  showSettingsModal: false,
  showFolderModal: false,
  showFileModal: false,
  showRunOutSpaceModal: false,
  showSortModal: false,
  showMoveFilesModal: false
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
    case layoutActionTypes.OPEN_FOLDER_MODAL:
      return {
        ...state,
        showFolderModal: true
      }
    case layoutActionTypes.CLOSE_FOLDER_MODAL:
      return {
        ...state,
        showFolderModal: false
      }
    case layoutActionTypes.OPEN_FILE_MODAL:
      return {
        ...state,
        showFileModal: true
      }
    case layoutActionTypes.CLOSE_FILE_MODAL:
      return {
        ...state,
        showFileModal: false
      }
    case layoutActionTypes.OPEN_RUNOUTSTORAGE_MODAL: {
      return {
        ...state,
        showRunOutSpaceModal: true
      }
    }
    case layoutActionTypes.CLOSE_RUNOUTSTORAGE_MODAL: {
      return {
        ...state,
        showRunOutSpaceModal: false
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
        showMoveFilesModal: true
      }
    }
    case layoutActionTypes.CLOSE_MOVEFILES_MODAL: {
      return {
        ...state,
        showMoveFilesModal: false
      }
    }
    default:
      return state;
  }
}
