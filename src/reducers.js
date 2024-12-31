import { combineReducers } from '@reduxjs/toolkit';
import openReducer from './features/openSlice';
import verseReducer from './features/verseSlice';
import phraseReducer from './features/phraseSlice';


const rootReducer = combineReducers({
  open: openReducer,
  verse: verseReducer,
  phrase: phraseReducer
});

export default rootReducer;
