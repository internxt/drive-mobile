import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaymentsState {
  sessionId: string;
  anonymousId: string;
}

const initialState: PaymentsState = {
  sessionId: '',
  anonymousId: '',
};

export const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setSessionId: (state: PaymentsState, action: PayloadAction<{ sessionId: string }>) => {
      state.sessionId = action.payload.sessionId;
    },
    setAnonymousId(state, action: PayloadAction<{ anonymousId: string }>) {
      state.anonymousId = action.payload.anonymousId;
    },
  },
});

export const paymentsActions = paymentsSlice.actions;

export default paymentsSlice.reducer;
