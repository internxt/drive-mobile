import { NavigationActions } from "react-navigation";

import { navigatorRef } from "../AppNavigator";
import { userActionTypes } from "../constants";
import { userService } from "../services";
import { fileActions } from "./file.actions";

export const userActions = {
  signin,
  signout
};

function signin() {
  return dispatch => {
    dispatch(request());

    userService.signin().then(
      userData => {
        dispatch(success(userData));

        // Redirect to Home screen
        navigatorRef.dispatch(
          NavigationActions.navigate({
            routeName: "Home",
            params: { folderId: userData.user.root_folder_id }
          })
        );

        // Call new data (root folder content)
        dispatch(fileActions.getFolderContent(userData.user.root_folder_id));
      },
      error => {
        dispatch(failure(error));
      }
    );
  };

  function request() {
    return { type: userActionTypes.SIGNIN_REQUEST };
  }
  function success(userData) {
    return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
  }
  function failure(error) {
    return { type: userActionTypes.SIGNIN_FAILURE, payload: error };
  }
}

function signout() {
  userService.signout();
  return { type: userActionTypes.SIGNOUT };
}
