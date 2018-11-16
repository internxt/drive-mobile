import { fileActionTypes, layoutActionTypes } from "../constants";
import { fileService } from "../services";

export const fileActions = {
  getFiles,
  createFolder
};

function getFiles(id = 0) {
  return dispatch => {
    dispatch(request());

    fileService.getFiles(id).then(
      data => {
        dispatch(
          success({
            currentDirId: id,
            items: data.files
          })
        );
      },
      error => {
        dispatch(failure(error));
      }
    );
  };

  function request() {
    return { type: fileActionTypes.GET_FILES_REQUEST };
  }
  function success(payload) {
    return { type: fileActionTypes.GET_FILES_SUCCESS, payload };
  }
  function failure(error) {
    return { type: fileActionTypes.GET_FILES_FAILURE, error };
  }
}

function createFolder(parentFolderId = 0, newFolderName) {
  return dispatch => {
    dispatch(request());

    fileService.createFolder(parentFolderId, newFolderName).then(
      data => {
        dispatch(
          success({
            currentDirId: parentFolderId,
            items: data.files
          })
        );

        // Close Create Folder Form
        dispatch({
          type: layoutActionTypes.CLOSE_CREATE_FOLDER_FORM
        });
      },
      error => {
        dispatch(failure(error));
      }
    );
  };

  function request() {
    return { type: fileActionTypes.CREATE_FOLDER_REQUEST };
  }
  function success(payload) {
    return { type: fileActionTypes.CREATE_FOLDER_SUCCESS, payload };
  }
  function failure(error) {
    return { type: fileActionTypes.CREATE_FOLDER_SUCCESS, error };
  }
}
