import { createStore, applyMiddleware, compose, Middleware, Dispatch, AnyAction } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import reducer from '../redux/reducers';

const lightweightLoggerMiddleware: Middleware = () => (next: Dispatch<AnyAction>) => (action) => {
  console.log('[REDUX LOG] Action: ', action.type);
  return next(action);
}

const composeEnhancers = composeWithDevTools || compose;
const middlewares = [thunkMiddleware, lightweightLoggerMiddleware];
const initialState = {};
const applyMiddlewareBuilder: any = applyMiddleware;

const store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddlewareBuilder(...middlewares))
);

export { store };
