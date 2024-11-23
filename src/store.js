import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './reducers'; // We'll create this soon

const store = configureStore({
  reducer: rootReducer,
});

export default store;
