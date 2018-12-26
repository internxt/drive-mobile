import { fileActionTypes, layoutActionTypes } from "../constants";
import { fileService } from "../services";

export const fileActions = {
  getFolderContent
};

function getFolderContent(folderId) {
  const id = parseInt(folderId);
  if (isNaN(id)) {
    return dispatch(failure(`Folder ID: "${folderId}" is not a number.`));
  }

  return dispatch => {
    dispatch(request());
    fileService
      .getFolderContent(id)
      .then(data => {
        dispatch(success(data));
      })
      .catch(error => {
        dispatch(failure(error));
      });
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

function createFolder(currentFolderId, newFolderName) {
  return dispatch => {
    dispatch(request());

    fileService.createFolder(currentFolderId, newFolderName).then(
      data => {
        dispatch(
          success({
            currentDirId: currentFolderId,
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
