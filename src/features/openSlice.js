import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  value: false,
};

const openSlice = createSlice({
  name: 'open',
  initialState,
  reducers: {
    open(state) {
      state.value = true;
    },
    close(state) {
      state.value = false ;
    },
  },
});

export const { open, close } = openSlice.actions;
export default openSlice.reducer;
