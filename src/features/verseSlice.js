import { createSlice } from '@reduxjs/toolkit';

const initialState = {};

const verseSlice = createSlice({
  name: 'verse',
  initialState,
  reducers: {
    setGlobalVerse(state, action) {
      return {...state, ...action.payload};
    },
  },
});

export const { setGlobalVerse } = verseSlice.actions;
export default verseSlice.reducer;
