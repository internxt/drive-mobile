import { userActionTypes } from '../constants';

export interface AuthenticationState {
  loggedIn: boolean
  token: string
  user: any
  error: string
  userStorage: any
}

const initialState: AuthenticationState = {
  loggedIn: false,
  token: '',
  user: {},
  error: '',
  userStorage: { usage: 0, limit: 0, percentage: 0 }
};

export function authenticationReducer(state = initialState, action: any) {
  switch (action.type) {
  case userActionTypes.SIGNIN_REQUEST:
    return {
      ...state
    };
  case userActionTypes.SIGNIN_SUCCESS:
    const { token, user } = action.payload;

    return {
      loggedIn: true,
      token,
      user
    };
  case userActionTypes.SIGNIN_FAILURE:
    return {
      loggedIn: false,
      error: action.payload
    };
  case userActionTypes.SIGNOUT:
    return {
      loggedIn: false,
      user: {}
    };
  case userActionTypes.LOCAL_SIGNIN:
    return {
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