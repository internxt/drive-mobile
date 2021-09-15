import { AnyAction } from 'redux';
import { userActionTypes } from '../constants';

export interface AuthenticationState {
  loggedIn: boolean
  token: string
  user: any
  error: string
  userStorage: {
    usage: number
    limit: number
    percentage: number
  }
}

const initialState: AuthenticationState = {
  loggedIn: false,
  token: '',
  user: {},
  error: '',
  userStorage: { usage: 0, limit: 0, percentage: 0 }
};

export function authenticationReducer(state = initialState, action: AnyAction): AuthenticationState {
  switch (action.type) {
  case userActionTypes.SIGNIN_REQUEST:
    return {
      ...state
    };
  case userActionTypes.SIGNIN_SUCCESS:
    const { token, user } = action.payload;

    return {
      ...state,
      loggedIn: true,
      token,
      user
    };
  case userActionTypes.SIGNIN_FAILURE:
    return {
      ...state,
      loggedIn: false,
      error: action.payload
    };
  case userActionTypes.SIGNOUT:
    return {
      ...state,
      loggedIn: false,
      user: {}
    };
  case userActionTypes.LOCAL_SIGNIN:
    return {
      ...state,
      loggedIn: true,
      token: action.payload.token,
      user: JSON.parse(action.payload.user)
    };
  case userActionTypes.SET_USER_STORAGE:
    return {
      ...state,
      userStorage: action.payload
    }
  default:
    return state;
  }
}