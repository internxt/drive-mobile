import { NavigationActions } from "react-navigation";

import { navigatorRef } from "../AppNavigator";
import { layoutActionTypes } from "../constants";

export const layoutActions = {
  openSearch,
  closeSearch,
  openCreateNewFolder,
  closeCreateNewFolder
};

function openSearch() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_SEARCH_FORM });
  };
}

function closeSearch() {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_SEARCH_FORM });
  };
}

function openCreateNewFolder(parentFolderId) {
  return dispatch => {
    dispatch({ type: layoutActionTypes.OPEN_CREATE_FOLDER_FORM });

    // Redirect to CreateFolder screen
    navigatorRef.dispatch(
      NavigationActions.navigate({
        routeName: "CreateFolder",
        params: { parentFolderId }
      })
    );
  };
}

function closeCreateNewFolder(folderId) {
  return dispatch => {
    dispatch({ type: layoutActionTypes.CLOSE_CREATE_FOLDER_FORM });

    // Redirect to Home screen
    navigatorRef.dispatch(
      NavigationActions.navigate({
        routeName: "Home",
        params: { folderId }
      })
    );
  };
}
