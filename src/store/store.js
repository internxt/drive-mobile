import { createStore, applyMiddleware, compose } from "redux";
import thunkMiddleware from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";

import reducer from "../reducers";

const composeEnhancers = composeWithDevTools || compose;
const middlewares = [thunkMiddleware];
const initialState = {};
const store = createStore(
  reducer,
  initialState,
  composeEnhancers(applyMiddleware(...middlewares))
);

export { store };
