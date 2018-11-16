import { userActionTypes } from "../constants";

const initialState = {};

export function authenticationReducer(state = initialState, action) {
  switch (action.type) {
    case userActionTypes.SIGNIN_REQUEST:
      return {
        loggingIn: true,
        user: action.user
      };
    case userActionTypes.SIGNIN_SUCCESS:
      return {
        loggedIn: true,
        user: action.user
      };
    case userActionTypes.SIGNIN_FAILURE:
      return {};
    case userActionTypes.SIGNOUT:
      return {};
    default:
      return state;
  }
}
