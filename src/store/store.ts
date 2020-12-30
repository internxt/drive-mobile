import { createStore, applyMiddleware, compose, Middleware, Dispatch, AnyAction } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import reducer from '../redux/reducers';

const lightweightLoggerMiddleware: Middleware = () => (next: Dispatch<AnyAction>) => (action) => {
  // eslint-disable-next-line no-console
  console.log('[REDUX LOG] Action: ', action.type);
  return next(action);
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
