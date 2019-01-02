import { userActionTypes } from "../constants";
import { userService } from "../services";

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
