import { Dispatch } from 'redux';
import analytics from '../../helpers/lytics';
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
    return userService
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
    analytics.identify(userData.user.uuid, {
      email: userData.user.email,
      platform: 'mobile',
      referrals_credit: userData.user.credit,
      referrals_count: Math.floor(userData.user.credit / 5),
      createdAt: userData.user.createdAt
    }).then(() => {
      analytics.track('user-signin', {
        email: userData.user.email,
        userId: userData.user.uuid,
        platform: 'mobile'
      }).catch(() => { })
    }).catch(() => { })
    return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
  }
  function failure(error: any) {
    analytics.track('user-signin-attempted', {
      status: 'error',
      message: error
    }).catch(() => {})
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

  function failure(error: Error) {
    return { type: userActionTypes.PAYMENT_FAILURE, payload: error };
  }
}
