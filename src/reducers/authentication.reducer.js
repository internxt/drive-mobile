import { userActionTypes } from "../constants";

const initialState = {
  loggedIn: false,
  token: "",
  user: {}
};

export function authenticationReducer(state = initialState, action) {
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
    default:
      return state;
  }
}
