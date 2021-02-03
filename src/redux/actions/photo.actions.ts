import { Dispatch } from 'redux';
import { getLyticsData } from '../../helpers';
import analytics from '../../helpers/lytics';
import { photoActionTypes } from '../constants/photoActionTypes.constants';
import { photoService } from '../services/photo.service';
//import { PhotoService } from '../services';
import { userActions } from './user.actions';

export const PhotoActions = {
  updateCursor,
  downloadPhotoStart,
  downloadPhotoEnd,
  downloadSelectedPhotoStart,
  downloadSelectedPhotoStop,
  uploadPhotoStart,
  uploadPhotoFinished,
  uploadPhotoFailed,
  uploadPhotoSetProgress,
  getAlbumList,
  getAllPhotos,
  getDevicePhotos,
  getDeletePhotos,
  getFolderContent,
  setFolderContent,
  selectPhoto,
  deselectPhoto,
  deselectAll,
  deleteItems,
  setSortFunction,
  setSearchString,
  createFolder,
  updateFolderMetadata,
  movePhoto,
  setRootFolderContent,
  setIsLoading
};

function setIsLoading(value: boolean) {
  return { type: photoActionTypes.SET_IS_LOADING, payload: value };
}

function updateCursor(newCursor: number) {
  return { type: photoActionTypes.UPDATE_CURSOR, payload: newCursor };
}

function downloadPhotoStart(photoId: string) {
  return { type: photoActionTypes.DOWNLOAD_PHOTO_START, payload: photoId };
}
function downloadPhotoEnd(photoId: string) {
  return { type: photoActionTypes.DOWNLOAD_PHOTO_END, payload: photoId };
}

// Will only download the current selected Photo defined in props
function downloadSelectedPhotoStart() {
  return { type: photoActionTypes.DOWNLOAD_SELECTED_PHOTO_START };
}

function downloadSelectedPhotoStop() {
  return { type: photoActionTypes.DOWNLOAD_SELECTED_PHOTO_STOP };
}

function uploadPhotoStart(photoName: string) {
  return { type: photoActionTypes.ADD_PHOTO_REQUEST, payload: photoName };
}

function uploadPhotoFinished() {
  return { type: photoActionTypes.ADD_PHOTO_SUCCESS };
}

function uploadPhotoFailed() {
  return { type: photoActionTypes.ADD_PHOTO_FAILURE };
}

function uploadPhotoSetProgress(percentage: number) {
  return { type: photoActionTypes.ADD_PHOTO_UPLOAD_PROGRESS, payload: percentage };
}

function getAlbumList(albumList: any) {
  return { type: photoActionTypes.GET_ALBUMS_SUCCESS, payload: albumList };
}

function getAllPhotos(photos: any) {
  return { type: photoActionTypes.GET_PHOTOS_SUCCESS, payload: photos };
}

function getDeletePhotos(photos: any) {
  return { type: photoActionTypes.GET_DELETE_SUCCESS, payload: photos };
}

function getDevicePhotos(photos: any) {
  return { type: photoActionTypes.GET_DEVICE_SUCCESS, payload: photos };
}

function getFolderContent(user: any) {
  return (dispatch: Dispatch) => {
    dispatch(request());
    photoService
      .getFolderContent(user)
      .then((data: any) => {
        console.log("getfoldercontent......", data)
        dispatch(success(data));
      }).catch(error => {
        dispatch(failure(error));
        if (error.status === 401) {
          dispatch(userActions.signout());
        }
      });
  };

  function request() {
    return { type: photoActionTypes.GET_PHOTOS_REQUEST };
  }
  function success(payload: any) {
    return { type: photoActionTypes.GET_PHOTOS_SUCCESS, payload };
  }
  function failure(error: any) {
    return { type: photoActionTypes.GET_PHOTOS_FAILURE, error };
  }
}

function getAlbumContent(folderId: string) {
  const id = parseInt(folderId);

  if (isNaN(id)) {
    return (dispatch: Dispatch) => {
      dispatch(failure(`Folder ID: "${folderId}" is not a number.`));
    };
  }

  return (dispatch: Dispatch) => {
    dispatch(request());
    PhotoService
      .getFolderContent(id)
      .then((data: any) => {
        data.currentFolder = id;
        dispatch(success(data));
      }).catch(error => {
        dispatch(failure(error));
        if (error.status === 401) {
          dispatch(userActions.signout());
        }
      });
  };

  function request() {
    return { type: photoActionTypes.GET_PHOTOS_REQUEST };
  }
  function success(payload: any) {
    return { type: photoActionTypes.GET_PHOTOS_SUCCESS, payload };
  }
  function failure(error: any) {
    return { type: photoActionTypes.GET_PHOTOS_FAILURE, error };
  }
}

function setFolderContent(photos: any[]) {
    return { type: photoActionTypes.SET_ALBUM_CONTENT, payload: photos };
  }

function deleteItems(items, folderToReload) {
  return async (dispatch: Dispatch) => {
    dispatch(request());
    PhotoService
      .deleteItems(items)
      .then(() => {
        dispatch(requestSuccess());
        setTimeout(() => {
          dispatch(getFolderContent(folderToReload));
        }, 1000);
      })
      .catch(() => {
        dispatch(requestFailure());
        setTimeout(() => {
          dispatch(getFolderContent(folderToReload));
        }, 1000);
      });
  };

  function request() {
    return { type: photoActionTypes.DELETE_PHOTO_REQUEST, payload: items };
  }

  function requestFailure() {
    return { type: photoActionTypes.DELETE_PHOTO_FAILURE };
  }

  function requestSuccess() {
    return { type: photoActionTypes.DELETE_PHOTO_SUCCESS };
  }
}

function selectPhoto(photo: any) {
  return (dispatch: Dispatch) => {
    dispatch({ type: photoActionTypes.SELECT_PHOTO, payload: photo });
  };
}

function deselectPhoto(photo: any) {
  return (dispatch: Dispatch) => {
    dispatch({ type: photoActionTypes.DESELECT_PHOTO, payload: photo });
  };
}

function deselectAll() {
  return (dispatch: Dispatch) => {
    dispatch({ type: photoActionTypes.DESELECT_ALL });
  };
}

function setSortFunction(sortType) {
  const sortFunc = PhotoService.getSortFunction(sortType);

  return (dispatch: Dispatch) => {
    dispatch({
      type: photoActionTypes.SET_SORT_TYPE,
      payload: [sortType, sortFunc]
    });
  };
}

function setSearchString(searchString: string) {
  return (dispatch: Dispatch) => {
    dispatch({
      type: photoActionTypes.SET_SEARCH_STRING,
      payload: searchString
    });
  };
}

function createFolder(parentFolderId: number, newFolderName: string) {
  return (dispatch: Dispatch) => {
    dispatch(request());

    PhotoService.createFolder(parentFolderId, newFolderName).then(
      (newFolderDetails: any) => {
        dispatch(success(newFolderDetails));
        dispatch(getFolderContent(parentFolderId + ''))
      },
      error => {
        dispatch(failure(error));
      }
    );
  };

  function request() {
    return { type: photoActionTypes.CREATE_ALBUM_REQUEST };
  }
  function success(newFolderDetails: any) {
    (async () => {
      const userData = await getLyticsData()

      analytics.track('folder-created', {
        userId: userData.uuid,
        platform: 'photos',
        email: userData.email
      }).catch(() => { })
    })()
    return {
      type: photoActionTypes.CREATE_ALBUM_SUCCESS,
      payload: newFolderDetails
    };
  }
  function failure(payload: any) {
    return { type: photoActionTypes.CREATE_ALBUM_FAILURE, payload };
  }
}

function movePhoto(photoId: string, destination: string) {
  return (dispatch: Dispatch) => {
    dispatch(request());
    PhotoService.movePhoto(photoId, destination).then(result => {
      dispatch(getFolderContent(destination))
      if (result === 1) {
        dispatch(success());
      } else {
        dispatch(failure(result));
      }
    });
  };

  function request() {
    return { type: photoActionTypes.MOVE_PHOTOS_REQUEST };
  }
  function success() {
    return { type: photoActionTypes.MOVE_PHOTOS_SUCCESS };
  }
  function failure(payload: any) {
    return { type: photoActionTypes.MOVE_PHOTOS_FAILURE, payload };
  }
}

function setRootFolderContent(folderContent: any) {
  return { type: photoActionTypes.SET_ROOTALBUM_CONTENT, payload: folderContent }
}

function updateFolderMetadata(metadata: any, folderId) {
  return (dispatch: Dispatch) => {
    dispatch(request());

    PhotoService
      .updateFolderMetadata(metadata, folderId)
      .then(() => {
        dispatch(success());
      })
      .catch(error => {
        dispatch(failure(error));
      });
  };

  function request() {
    return { type: photoActionTypes.UPDATE_ALBUM_METADATA_REQUEST };
  }
  function success() {
    return { type: photoActionTypes.UPDATE_ALBUM_METADATA_SUCCESS };
  }
  function failure(payload: any) {
    return { type: photoActionTypes.UPDATE_ALBUM_METADATA_FAILURE, payload };
  }
}