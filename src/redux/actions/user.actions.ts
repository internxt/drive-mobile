import { Dispatch } from 'redux';
import { userActionTypes } from '../constants';
import { userService } from '../services';

export const userActions = {
  signin,
  signout,
  localSignIn,
  payment,
  userInitializaation
};

function signin(email: string, password: string, sKey: string, twoFactorCode: string) {
  return (dispatch: Dispatch) => {
    dispatchRequest();
    userService
      .signin(email, password, sKey, twoFactorCode)
      .then(userData => {
        dispatch(success(userData));
      })
      .catch(error => {
        dispatch(failure(error));
      });
  };

  function dispatchRequest() {
    return (dispatch: Dispatch) => {
      dispatch(request());
    };
  }

  function request() {
    return { type: userActionTypes.SIGNIN_REQUEST };
  }
  function success(userData: any) {
    return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
  }
  function failure(error: any) {
    return { type: userActionTypes.SIGNIN_FAILURE, payload: error };
  }
}

function userInitializaation(userData: any) {
  return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
}

function signout() {
  userService.signout();
  return { type: userActionTypes.SIGNOUT };
}

function localSignIn(token: any, user: any) {
  const data = { token, user };
  return { type: userActionTypes.LOCAL_SIGNIN, payload: data };
}

function payment(token: any, planId: any) {
  return (dispatch: Dispatch) => {
    dispatch(request());
    userService
      .payment(token, planId)
      .then(() => {
        dispatch(success());
      })
      .catch(error => {
        dispatch(failure(error));
      });
  };

  function request() {
    return { type: userActionTypes.PAYMENT_REQUEST };
  }

  function success() {
    return { type: userActionTypes.PAYMENT_SUCCESS };
  }

  function failure(error: any) {
    return { type: userActionTypes.PAYMENT_FAILURE, payload: error };
  }
}
