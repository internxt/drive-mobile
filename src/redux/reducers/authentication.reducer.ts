import { userActionTypes } from '../constants';

const initialState = {
  loggedIn: false,
  token: '',
  user: {}
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
    default:
      return state;
  }
}