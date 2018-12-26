import { userActionTypes } from "../constants";

const initialState = {
  loggedIn: false,
  token: "",
  user: {
    // "email": "ruzicic@gmail.com",
    // "id": 3,
    // "isFreeTier": true,
    // "mnemonic": "erase catch smooth vote memory mix sail employ sell brave rose human loan feel flat okay blame picture song reflect repair leopard nasty sting",
    // "root_folder_id": 2,
    // "userId": "$2a$08$wNBgek68hOR/Vxi7nuHrf.vbMnxbhgBBfq89JWwfeJPg4oFtPgzDu",
  }
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
