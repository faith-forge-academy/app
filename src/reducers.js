import { combineReducers } from '@reduxjs/toolkit';
import openReducer from './features/openSlice';
import verseReducer from './features/verseSlice';


const rootReducer = combineReducers({
  open: openReducer,
  verse: verseReducer,
});

export default rootReducer;
