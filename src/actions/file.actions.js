import { NavigationActions } from "react-navigation";

import { navigatorRef } from "../AppNavigator";
import { fileActionTypes, layoutActionTypes } from "../constants";
import { fileService } from "../services";

export const fileActions = {
  getFolderContent,
  selectFile,
  deselectAll,
  createFolder
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

function selectFile(file) {
  return dispatch => {
    dispatch({ type: fileActionTypes.SELECT_FILE, payload: file });
  };
}

function deselectAll() {
  return dispatch => {
    dispatch({ type: fileActionTypes.DESELECT_ALL });
  };
}

function createFolder(parentFolderId, newFolderName) {
  return dispatch => {
    dispatch(request());

    fileService.createFolder(parentFolderId, newFolderName).then(
      newFolderDetails => {
        dispatch(success(newFolderDetails));

        // Close Create Folder Form
        dispatch({
          type: layoutActionTypes.CLOSE_CREATE_FOLDER_FORM
        });

        // Redirect to Home screen
        navigatorRef.dispatch(
          NavigationActions.navigate({
            routeName: "Home",
            params: { folderId: newFolderDetails.id }
          })
        );
      },
      error => {
        dispatch(failure(error));

        // Redirect to Home screen
        navigatorRef.dispatch(
          NavigationActions.navigate({
            routeName: "Home",
            params: { folderId: parentFolderId }
          })
        );
      }
    );
  };

  function request() {
    return { type: fileActionTypes.CREATE_FOLDER_REQUEST };
  }
  function success(newFolderDetails) {
    return {
      type: fileActionTypes.CREATE_FOLDER_SUCCESS,
      payload: newFolderDetails
    };
  }
  function failure(payload) {
    return { type: fileActionTypes.CREATE_FOLDER_SUCCESS, payload };
  }
}
