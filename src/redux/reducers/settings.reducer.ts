import { userActionTypes } from '../constants';

interface ReduxAction {
  type: string
  payload: any
}

const initialState = {
  loading: false,
  plan_changed: false,
  error: ''
};

export function settingsReducer(state = initialState, action: ReduxAction): any {
  switch (action.type) {
    case userActionTypes.PAYMENT_REQUEST:
      return {
        ...state,
        loading: true
      };
    case userActionTypes.PAYMENT_SUCCESS:
      return {
        loading: false,
        plan_changed: true
      };
    case userActionTypes.PAYMENT_FAILURE:
      return {
        loading: false,
        error: action.payload
      };
    default:
      return state;
  }
}