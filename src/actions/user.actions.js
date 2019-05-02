import { userActionTypes } from "../constants";
import { userService } from "../services";

export const userActions = {
  signin,
  signout,
  localSignIn
};

function signin(email, password, sKey, twoFactorCode) {
  return dispatch => {
    dispatch(request());

    userService.signin(email, password, sKey, twoFactorCode)
      .then(userData => {
        dispatch(success(userData));
      }).catch(error => {
        dispatch(failure(error));
      });
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

function localSignIn(token, user) {
  const data = { token, user }
  return { type: userActionTypes.LOCAL_SIGNIN, payload: data };
}
