import { createStore, applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';

import reducer from '../reducers';

const ENABLE_DEBUGGING = true;

const lightweightLoggerMiddleware = store => next => action => {
  if (
    process &&
    process.env &&
    process.env.NODE_ENV == 'development' &&
    ENABLE_DEBUGGING
  ) {
    console.log('[REDUX LOG] Action: ', action.type);
  }
  next(action);
};

const composeEnhancers = composeWithDevTools || compose;
const middlewares = [thunkMiddleware, lightweightLoggerMiddleware];
const initialState = {};
const store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddleware(...middlewares))
);

export { store };
