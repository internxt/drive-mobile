import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PaymentsState {
  sessionId: string;
}

const initialState: PaymentsState = {
  sessionId: '',
};

export const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
    },
  },
});

export const paymentsActions = paymentsSlice.actions;

export default paymentsSlice.reducer;
