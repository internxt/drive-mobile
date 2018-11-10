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
      user => {
        dispatch(success(user));
      },
      error => {
        dispatch(failure(error));
      }
    );
  };

  function request(user) {
    return { type: userActionTypes.SIGNIN_REQUEST, user };
  }
  function success(user) {
    return { type: userActionTypes.SIGNIN_SUCCESS, user };
  }
  function failure(error) {
    return { type: userActionTypes.SIGNIN_FAILURE, error };
  }
}

function signout() {
  userService.signout();
  return { type: userActionTypes.SIGNOUT };
}
