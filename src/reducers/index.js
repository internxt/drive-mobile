import { combineReducers } from "redux";

import { authentication } from "./authentication.reducer";
import { files } from "./files.reducer";

const rootReducer = combineReducers({
  authentication,
  files
});

export default rootReducer;
