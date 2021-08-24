import { AnyAction, Dispatch } from 'redux';
import { userActionTypes } from '../constants';
import { userService } from '../services';

export const userActions = {
  signin,
  signout,
  localSignIn,
  payment,
  userInitializaation,
  setUserStorage
};

function signin(userData) {
  return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
}

function userInitializaation(userData: any): AnyAction {
  return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
}

function signout(): AnyAction {
  userService.signout();
  return { type: userActionTypes.SIGNOUT };
}

function localSignIn(token: string, user: any): AnyAction {
  const data = { token, user };

  return { type: userActionTypes.LOCAL_SIGNIN, payload: data };
}

function payment(token: string, planId: any) {
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

  function request(): AnyAction {
    return { type: userActionTypes.PAYMENT_REQUEST };
  }

  function success(): AnyAction {
    return { type: userActionTypes.PAYMENT_SUCCESS };
  }

  function failure(error: Error): AnyAction {
    return { type: userActionTypes.PAYMENT_FAILURE, payload: error };
  }
}

function setUserStorage(currentPlan: any): AnyAction {
  return { type: userActionTypes.SET_USER_STORAGE, payload: currentPlan }
}
