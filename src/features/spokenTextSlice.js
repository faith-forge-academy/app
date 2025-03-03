import { createSlice } from '@reduxjs/toolkit';

const initialState = '';

const spokenTextSlice = createSlice({
  name: 'spokenText',
  initialState,
  reducers: {
    setSpokenText(state, action) {
      return state + ' ' + action.payload;
    },
  },
});

export const { setSpokenText } = spokenTextSlice.actions;
export default spokenTextSlice.reducer;