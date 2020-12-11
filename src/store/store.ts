import { createStore, applyMiddleware, compose } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import reducer from '../redux/reducers';

const lightweightLoggerMiddleware = (store: any) => (next: any) => (action: any) => {
  console.log('[REDUX LOG] Action: ', action.type);
  next(action);
}

const composeEnhancers = composeWithDevTools || compose;
const middlewares = [thunkMiddleware, lightweightLoggerMiddleware];
const initialState = {};

const store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddleware(...middlewares))
);


export { store };
