import { createSlice } from '@reduxjs/toolkit';

const initialState = [];

const wordCollectionSlice = createSlice({
  name: 'wordCollection',
  initialState,
  reducers: {
    setGlobalWordCollection(state, action) {
      return [...action.payload];
    },

    setWordCollectionInstance(state, action) {
      state[action.payload.idx] = action.payload;
    }
  },
});

export const { setGlobalWordCollection, setWordCollectionInstance } = wordCollectionSlice.actions;
export default wordCollectionSlice.reducer;
