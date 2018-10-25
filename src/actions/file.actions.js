import { fileActionTypes } from "../constants";
import { fileService } from "../services";

export const fileActions = {
  getFiles
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
        dispatch(alertActions.error(error));
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
