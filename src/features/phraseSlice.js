import { createSlice } from '@reduxjs/toolkit';

const initialState = 1;

const phraseSlice = createSlice({
  name: 'phrase',
  initialState,
  reducers: {
    setGlobalPhrase(state, action) {
      return parseInt(action.payload);
    },
  },
});

export const { setGlobalPhrase } = phraseSlice.actions;
export default phraseSlice.reducer;
