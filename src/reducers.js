import { combineReducers } from '@reduxjs/toolkit';
import openReducer from './features/openSlice';
import verseReducer from './features/verseSlice';
import phraseReducer from './features/phraseSlice';
import wordCollectionReducer from './features/wordCollectionSlice';


const rootReducer = combineReducers({
  open: openReducer,
  verse: verseReducer,
  phrase: phraseReducer,
  wordCollection: wordCollectionReducer
});

export default rootReducer;
