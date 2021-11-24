import { AnyAction, Dispatch } from 'redux';
import { getAnalyticsData } from '../../services/analytics';
import analytics from '../../services/analytics';
import { store } from '..';
import { fileActionTypes } from '../constants';
import { layoutActions } from './layout.actions';
import { userActions } from './user.actions';
import { notify } from '../../services/toast';
import fileService from '../../services/file';
import {
  DevicePlatform,
  DriveFileData,
  DriveFileMetadataPayload,
  DriveFolderData,
  DriveFolderMetadataPayload,
} from '../../types';

function downloadFileStart(fileId: string): AnyAction {
  return { type: fileActionTypes.DOWNLOAD_FILE_START, payload: fileId };
}
function downloadFileEnd(fileId: string): AnyAction {
  return { type: fileActionTypes.DOWNLOAD_FILE_END, payload: fileId };
}

// Will only download the current selected file defined in props
function downloadSelectedFileStart(): AnyAction {
  return { type: fileActionTypes.DOWNLOAD_SELECTED_FILE_START };
}

function downloadSelectedFileStop(): AnyAction {
  return { type: fileActionTypes.DOWNLOAD_SELECTED_FILE_STOP };
}

function uploadFileStart(): AnyAction {
  return { type: fileActionTypes.ADD_FILE_REQUEST };
}

function addUploadingFile(file: any): AnyAction {
  return { type: fileActionTypes.ADD_UPLOADING_FILE, payload: file };
}

function addUploadedFile(file: any): AnyAction {
  return { type: fileActionTypes.ADD_UPLOADED_FILE, payload: file };
}

function removeUploadingFile(id: string): AnyAction {
  return { type: fileActionTypes.REMOVE_UPLOADING_FILE, payload: id };
}

function removeUploadedFile(file: any): AnyAction {
  return { type: fileActionTypes.REMOVE_UPLOADED_FILE, payload: file };
}

function uploadFileFinished(name?: string): AnyAction {
  return { type: fileActionTypes.ADD_FILE_SUCCESS, payload: name };
}

function uploadFileFailed(id?: number): AnyAction {
  return { type: fileActionTypes.ADD_FILE_FAILURE, payload: id };
}

function uploadFileSetProgress(progress: number, id?: string): AnyAction {
  const payload = { progress, id };

  return { type: fileActionTypes.ADD_FILE_UPLOAD_PROGRESS, payload };
}

function uploadFileSetUri(uri: string | undefined): AnyAction {
  return { type: fileActionTypes.SET_FILE_UPLOAD_URI, payload: uri };
}

function fetchIfSameFolder(fileFolder: number) {
  return (dispatch: Dispatch): AnyAction => {
    const currentFoder = store.getState().filesState.folderContent.currentFolder;

    if (fileFolder === currentFoder) {
      return dispatch(getFolderContent(currentFoder));
    }
  };
}

function getFolderContent(folderId: string | number, quick?: boolean): any {
  const id = typeof folderId === 'string' ? parseInt(folderId) : folderId;

  if (isNaN(id)) {
    return (dispatch: Dispatch): AnyAction => {
      return dispatch(failure(Error(`Folder ID: "${folderId}" is not a number.`)));
    };
  }
  return (dispatch: Dispatch) => {
    dispatch(request());
    if (!quick) {
      fileService
        .getFolderContent(id)
        .then((data) => {
          data.currentFolder = id;
          dispatch(success(data));
        })
        .catch((error) => {
          dispatch(failure(error));
          if (error.status === 401) {
            dispatch(userActions.signout());
          }
        });
    } else {
      dispatch(success(store.getState().filesState.folderContent));
    }
  };

  function request(): AnyAction {
    return { type: fileActionTypes.GET_FILES_REQUEST };
  }
  function success(payload: any): AnyAction {
    return { type: fileActionTypes.GET_FILES_SUCCESS, payload };
  }
  function failure(error: Error): AnyAction {
    return { type: fileActionTypes.GET_FILES_FAILURE, error };
  }
}

function deleteItems(items: any, folderToReload: any): any {
  return async (dispatch: Dispatch) => {
    dispatch(request());
    dispatch(getFolderContent(folderToReload, true));

    notify({
      text: 'Item deleted',
      type: 'success',
    });

    return fileService
      .deleteItems(items)
      .then(() => {
        return dispatch(requestSuccess());
      })
      .catch((err) => {
        dispatch(requestFailure());
        notify({
          text: err.message,
          type: 'error',
        });
        setTimeout(() => {
          dispatch(getFolderContent(folderToReload));
        }, 3000);
      });
  };

  function request(): AnyAction {
    return { type: fileActionTypes.DELETE_FILE_REQUEST, payload: items };
  }

  function requestFailure(): AnyAction {
    return { type: fileActionTypes.DELETE_FILE_FAILURE };
  }

  function requestSuccess(): AnyAction {
    return { type: fileActionTypes.DELETE_FILE_SUCCESS };
  }
}

function selectFile(file: any): AnyAction {
  return { type: fileActionTypes.SELECT_ITEM, payload: file };
}

function deselectFile(file: any): AnyAction {
  return { type: fileActionTypes.DESELECT_ITEM, payload: file };
}

function focusItem(item: any): AnyAction {
  return { type: fileActionTypes.FOCUS_ITEM, payload: item };
}

function unfocusItem(item: any): AnyAction {
  return { type: fileActionTypes.UNFOCUS_ITEM };
}

function deselectAll(): AnyAction {
  return { type: fileActionTypes.DESELECT_ALL };
}

function setSortFunction(sortType: any): AnyAction {
  const sortFunc = fileService.getSortFunction(sortType);

  return {
    type: fileActionTypes.SET_SORT_TYPE,
    payload: [sortType, sortFunc],
  };
}

function setSearchString(searchString: string): AnyAction {
  return {
    type: fileActionTypes.SET_SEARCH_STRING,
    payload: searchString,
  };
}

function createFolder(parentFolderId: number, newFolderName: string) {
  return (dispatch: Dispatch) => {
    dispatch(request());

    fileService.createFolder(parentFolderId, newFolderName).then(
      (newFolderDetails: any) => {
        dispatch(success(newFolderDetails));
        dispatch(getFolderContent(parentFolderId + ''));
      },
      (error) => {
        dispatch(failure(error));
      },
    );
  };

  function request(): AnyAction {
    return { type: fileActionTypes.CREATE_FOLDER_REQUEST };
  }
  function success(newFolderDetails: any) {
    (async () => {
      const userData = await getAnalyticsData();

      analytics
        .track('folder-created', {
          userId: userData.uuid,
          platform: DevicePlatform.Mobile,
          email: userData.email,
        })
        .catch(() => undefined);
    })();
    return {
      type: fileActionTypes.CREATE_FOLDER_SUCCESS,
      payload: newFolderDetails,
    };
  }
  function failure(payload: any) {
    return { type: fileActionTypes.CREATE_FOLDER_FAILURE, payload };
  }
}

function moveFile(fileId: string, destination: string) {
  return (dispatch: Dispatch) => {
    dispatch(request());
    fileService.moveFile(fileId, destination).then((result) => {
      dispatch(fileActions.getFolderContent(destination));
      if (result === 1) {
        dispatch(success());
      } else {
        dispatch(failure(result));
      }
    });
  };

  function request(): AnyAction {
    return { type: fileActionTypes.MOVE_FILES_REQUEST };
  }
  function success(): AnyAction {
    return { type: fileActionTypes.MOVE_FILES_SUCCESS };
  }
  function failure(payload: any): AnyAction {
    return { type: fileActionTypes.MOVE_FILES_FAILURE, payload };
  }
}

function setRootFolderContent(folderContent: any): AnyAction {
  return { type: fileActionTypes.SET_ROOTFOLDER_CONTENT, payload: folderContent };
}

function setUri(uri: any) {
  if (uri) {
    getAnalyticsData().then((user) => {
      analytics.track('share-to', {
        email: user.email,
        uri: uri.fileUri ? uri.fileUri : uri.toString && uri.toString(),
      });
    });
  }
  return { type: fileActionTypes.SET_URI, payload: uri };
}

function updateFileMetadata(file: DriveFileData, metadata: DriveFileMetadataPayload) {
  return (dispatch: Dispatch) => {
    dispatch(request());

    /* fileService
      .updateMetaData(folderId, metadata)
      .then(() => {
        dispatch(success());
      })
      .catch(error => {
        dispatch(failure(error));
      }); */

    dispatch(success());
  };

  function request(): AnyAction {
    return { type: fileActionTypes.UPDATE_FILE_METADATA_REQUEST };
  }
  function success(): AnyAction {
    return { type: fileActionTypes.UPDATE_FILE_METADATA_SUCCESS };
  }
  function failure(payload: any): AnyAction {
    return { type: fileActionTypes.UPDATE_FILE_METADATA_FAILURE, payload };
  }
}

function updateFolderMetadata(folder: DriveFolderData, metadata: DriveFolderMetadataPayload) {
  return (dispatch: Dispatch) => {
    const { absolutePath } = store.getState().filesState;

    dispatch(request());

    /* folderService
      .updateMetaData(folderId, metadata)
      .then(() => {
        dispatch(success());
      })
      .catch(error => {
        dispatch(failure(error));
      }); */

    dispatch(success());
  };

  function request(): AnyAction {
    return { type: fileActionTypes.UPDATE_FOLDER_METADATA_REQUEST };
  }
  function success(): AnyAction {
    return { type: fileActionTypes.UPDATE_FOLDER_METADATA_SUCCESS };
  }
  function failure(payload: any): AnyAction {
    return { type: fileActionTypes.UPDATE_FOLDER_METADATA_FAILURE, payload };
  }
}

function updateUploadingFile(id: string): AnyAction {
  return { type: fileActionTypes.UPDATE_UPLOADING_FILE, payload: id };
}

function addDepthAbsolutePath(levelsToAdd: string[]): AnyAction {
  return { type: fileActionTypes.ADD_DEPTH_ABSOLUTE_PATH, payload: levelsToAdd };
}

function removeDepthAbsolutePath(nLevels: number): AnyAction {
  return { type: fileActionTypes.REMOVE_DEPTH_ABSOLUTE_PATH, payload: nLevels };
}

function goBack(folderId: string) {
  const id = parseInt(folderId);

  if (isNaN(id)) {
    return (dispatch: Dispatch): AnyAction => {
      return dispatch(failure(Error(`Folder ID: "${folderId}" is not a number.`)));
    };
  }

  return (dispatch: Dispatch) => {
    dispatch(layoutActions.disableBackButton());
    dispatch(request());
    fileService
      .getFolderContent(id)
      .then((data: any) => {
        data.currentFolder = id;
        dispatch(success(data));
      })
      .catch((error) => {
        dispatch(failure(error));
        if (error.status === 401) {
          dispatch(userActions.signout());
        }
      })
      .finally(() => {
        dispatch(removeDepthAbsolutePath(1));
        dispatch(layoutActions.enableBackButton());
      });
  };

  function request(): AnyAction {
    return { type: fileActionTypes.GET_FILES_REQUEST };
  }
  function success(payload: any): AnyAction {
    return { type: fileActionTypes.GET_FILES_SUCCESS, payload };
  }
  function failure(error: Error): AnyAction {
    return { type: fileActionTypes.GET_FILES_FAILURE, error };
  }
}

export const fileActions = {
  downloadFileStart,
  downloadFileEnd,
  downloadSelectedFileStart,
  downloadSelectedFileStop,
  uploadFileStart,
  uploadFileFinished,
  uploadFileFailed,
  uploadFileSetProgress,
  uploadFileSetUri,
  getFolderContent,
  selectFile,
  deselectFile,
  focusItem,
  unfocusItem,
  deselectAll,
  deleteItems,
  setSortFunction,
  setSearchString,
  createFolder,
  updateFileMetadata,
  updateFolderMetadata,
  moveFile,
  setRootFolderContent,
  setUri,
  addUploadingFile,
  addUploadedFile,
  removeUploadingFile,
  removeUploadedFile,
  fetchIfSameFolder,
  updateUploadingFile,
  addDepthAbsolutePath,
  removeDepthAbsolutePath,
  goBack,
};
