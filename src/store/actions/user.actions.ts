import { AnyAction, Dispatch } from 'redux';
import analytics from '../../helpers/analytics';
import { userActionTypes } from '../constants';
import authService from '../../services/auth';
import userService from '../../services/user';

export const userActions = {
  signin,
  signout,
  localSignIn,
  payment,
  initializeUser,
  setUserStorage,
};

function signin(email: string, password: string, sKey: string, twoFactorCode: string) {
  return (dispatch: Dispatch) => {
    failure('');
    dispatchRequest();
    return userService
      .signin(email, password, sKey, twoFactorCode)
      .then((userData) => {
        return dispatch(success({ ...userData }));
      })
      .catch((error) => {
        return dispatch(failure(error));
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
    analytics
      .identify(userData.user.uuid, {
        email: userData.user.email,
        platform: 'mobile',
        // eslint-disable-next-line camelcase
        referrals_credit: userData.user.credit,
        // eslint-disable-next-line camelcase
        referrals_count: Math.floor(userData.user.credit / 5),
        createdAt: userData.user.createdAt,
      })
      .then(() => {
        analytics
          .track('user-signin', {
            email: userData.user.email,
            userId: userData.user.uuid,
            platform: 'mobile',
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);
    return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
  }
  function failure(error: any) {
    analytics
      .track('user-signin-attempted', {
        status: 'error',
        message: error,
      })
      .catch(() => undefined);
    return { type: userActionTypes.SIGNIN_FAILURE, payload: error };
  }
}

function initializeUser(userData: any): AnyAction {
  return { type: userActionTypes.SIGNIN_SUCCESS, payload: userData };
}

function signout(): AnyAction {
  authService.signout();
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
      .catch((error) => {
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
  return { type: userActionTypes.SET_USER_STORAGE, payload: currentPlan };
}
