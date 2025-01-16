import { combineReducers } from '@reduxjs/toolkit';
import openReducer from './features/openSlice';
import verseReducer from './features/verseSlice';
import phraseReducer from './features/phraseSlice';
import wordCollectionReducer from './features/wordCollectionSlice';
import spokenTextReducer from './features/spokenTextSlice';


const rootReducer = combineReducers({
  open: openReducer,
  verse: verseReducer,
  phrase: phraseReducer,
  wordCollection: wordCollectionReducer,
  spokenText: spokenTextReducer
});

export default rootReducer;
