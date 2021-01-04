import { userActionTypes } from '../constants';

export interface SettingsState {
  loading: boolean
  plan_changed: boolean
  error: string
}
interface ReduxAction {
  type: string
  payload: any
}

const initialState: SettingsState = {
  loading: false,
  plan_changed: false,
  error: ''
};

export function settingsReducer(state = initialState, action: ReduxAction): any {
  switch (action.type) {
  case userActionTypes.PAYMENT_REQUEST:
    return {
      ...state,
      loading: true,
      error: ''
    };
  case userActionTypes.PAYMENT_SUCCESS:
    return {
      loading: false,
      plan_changed: true,
      error: ''
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