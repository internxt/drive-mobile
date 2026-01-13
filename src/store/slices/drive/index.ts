import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { logger } from '@internxt-mobile/services/common';
import drive from '@internxt-mobile/services/drive';
import { items } from '@internxt/lib';
import { isValidFilename } from 'src/helpers';
import authService from 'src/services/AuthService';
import errorService from 'src/services/ErrorService';
import { ErrorCodes } from 'src/types/errors';
import { RootState } from '../..';
import strings from '../../../../assets/lang/strings';
import analyticsService from '../../../services/AnalyticsService';
import { MAX_SIZE_TO_DOWNLOAD } from '../../../services/drive/constants';
import fileSystemService from '../../../services/FileSystemService';
import notificationsService from '../../../services/NotificationsService';
import { NotificationType } from '../../../types';
import {
  DownloadingFile,
  DriveEventKey,
  DriveItemData,
  DriveItemFocused,
  DriveItemStatus,
  DriveListItem,
  DriveNavigationStack,
  DriveNavigationStackItem,
  UploadingFile,
} from '../../../types/drive';
import { DownloadAnalytics, FileInfo } from './DownloadAnalytics';

export enum ThunkOperationStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  LOADING = 'LOADING',
  IDLE = 'IDLE',
}

const DOWNLOAD_ERROR_CODES = { MAX_SIZE_TO_DOWNLOAD_REACHED: 1 };

export interface FocusedShareItem {
  id: string;
  hashedPassword?: string;
  views: number;
}
export interface DriveState {
  isInitialized: boolean;
  isLoading: boolean;
  navigationStack: DriveNavigationStack;
  items: DriveItemData[];
  hiddenItemsIds: string[];
  currentFolderId: number;
  uploadingFiles: UploadingFile[];
  downloadingFile?: DownloadingFile;
  selectedItems: DriveItemData[];
  folderContent: DriveItemData[];
  focusedItem: DriveItemFocused;
  focusedShareItem: FocusedShareItem | null;
  itemToMove: DriveItemFocused;
  searchString: string;
  isUploading: boolean;
  isUploadingFileName: string | null;
  uploadFileUri: string | undefined | null;
  progress: number;
  error?: string | null;
  uri?: string;
  pendingDeleteItems: { [key: string]: boolean };
  absolutePath: string;
  usage: number;
  recents: DriveFileData[];
  recentsStatus: ThunkOperationStatus;
}

const initialState: DriveState = {
  isInitialized: false,
  navigationStack: [],
  focusedShareItem: null,
  isLoading: false,
  items: [],
  currentFolderId: -1,
  hiddenItemsIds: [],
  folderContent: [],
  focusedItem: null,
  absolutePath: '/',
  itemToMove: null,
  uploadingFiles: [],
  downloadingFile: undefined,
  selectedItems: [],
  searchString: '',
  isUploading: false,
  isUploadingFileName: '',
  uploadFileUri: '',
  progress: 0,
  error: undefined,
  uri: undefined,
  pendingDeleteItems: {},
  usage: 0,
  recents: [],
  recentsStatus: ThunkOperationStatus.IDLE,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'drive/initialize',
  async (payload, { dispatch }) => {
    const { credentials } = await authService.getAuthCredentials();

    if (credentials) {
      dispatch(getRecentsThunk());
    }
  },
);

const getRecentsThunk = createAsyncThunk<void, void>('drive/getRecents', async (_, { dispatch }) => {
  dispatch(driveActions.setRecentsStatus(ThunkOperationStatus.LOADING));
  const recents = await drive.recents.getRecents();
  const recentsParsed = recents.map((recent) => ({
    ...recent,
    name: recent.plainName ?? recent.name,
  }));
  dispatch(driveActions.setRecents(recentsParsed));
});

const cancelDownloadThunk = createAsyncThunk<void, void, { state: RootState }>('drive/cancelDownload', () => {
  drive.events.emit({ event: DriveEventKey.CancelDownload });
});

const validateDownload = (size: number | undefined): number | null => {
  if (!size) return null;

  const sizeInBytes = parseInt(size.toString());
  if (sizeInBytes > MAX_SIZE_TO_DOWNLOAD['10GB']) {
    return DOWNLOAD_ERROR_CODES.MAX_SIZE_TO_DOWNLOAD_REACHED;
  }
  return null;
};

const downloadFileThunk = createAsyncThunk<
  void,
  {
    id: number;
    size: number;
    bucketId: string;
    parentId: number;
    name: string;
    type: string;
    fileId: string;
    updatedAt: string;
    openFileViewer: boolean;
  },
  { state: RootState }
>(
  'drive/downloadFile',
  async (
    { id, size, parentId, name, type, fileId, openFileViewer, updatedAt, bucketId },
    { signal, getState, dispatch, rejectWithValue },
  ) => {
    logger.info('Starting file download...');
    const { user } = getState().auth;
    // BEFORE DOWNLOAD VALIDATIONS
    const currentDownload = getState().drive.downloadingFile;

    if (currentDownload && currentDownload.data.fileId === fileId) {
      await dispatch(cancelDownloadThunk());
    }

    const validationError = validateDownload(size);
    if (validationError) {
      dispatch(
        driveActions.updateDownloadingFile({
          error: strings.messages.downloadLimit,
        }),
      );
      return rejectWithValue(validationError);
    }

    dispatch(
      driveActions.updateDownloadingFile({
        retry: async () => {
          dispatch(driveActions.clearDownloadingFile());
          dispatch(
            driveThunks.downloadFileThunk({
              id,
              size,
              parentId,
              bucketId,
              name,
              type,
              fileId,
              openFileViewer,
              updatedAt,
            }),
          );
        },
      }),
    );

    // PROGRESS CALLBACKS
    const downloadProgressCallback = (progress: number) => {
      if (signal.aborted) {
        return;
      }

      dispatch(
        driveActions.updateDownloadingFile({
          downloadProgress: progress,
        }),
      );
    };

    const decryptionProgressCallback = (progress: number) => {
      if (signal.aborted) return;

      const currentState = getState().drive.downloadingFile;
      if (currentState && currentState.data.fileId === fileId) {
        dispatch(
          driveActions.updateDownloadingFile({
            decryptProgress: Math.max(currentState.downloadProgress || 0, progress),
          }),
        );
      }
    };

    const download = (params: { fileId: string; to: string }) => {
      if (!user) {
        return;
      }

      return drive.file.downloadFile(
        user,
        bucketId,
        params.fileId,
        {
          downloadPath: params.to,
          decryptionProgressCallback,
          downloadProgressCallback,
          signal: signal,
          onAbortableReady: drive.events.setLegacyAbortable,
        },
        size,
      );
    };

    const analytics = new DownloadAnalytics(analyticsService);

    const fileInfo: FileInfo = {
      id: id,
      size: size,
      type: type,
      parentId: parentId,
    };

    const destinationPath = drive.file.getDecryptedFilePath(name, type);
    logger.info(`Download destination path: ${destinationPath} `);
    const fileAlreadyExists = await drive.file.existsDecrypted(name, type);
    try {
      if (!isValidFilename(name)) {
        throw new Error('This file name is not valid');
      }
      if (signal.aborted) {
        return rejectWithValue(null);
      }

      if (!fileAlreadyExists) {
        analytics.trackStart(fileInfo);
        downloadProgressCallback(0);

        await download({ fileId, to: destinationPath });
      }

      const uri = fileSystemService.pathToUri(destinationPath);
      dispatch(driveActions.updateDownloadingFile({ downloadedFilePath: uri }));
      if (openFileViewer) {
        await fileSystemService.showFileViewer(uri, { displayName: items.getItemDisplayName({ name, type }) });
      }

      analytics.trackSuccess(fileInfo);
    } catch (err) {
      logger.error('Error in downloadFileThunk ', JSON.stringify(err));
      /**
       * In case something fails, we remove the file in case it exists, that way
       * we don't use wrong encrypted cached files
       */
      if (fileAlreadyExists) {
        await fileSystemService.unlink(destinationPath);
      }

      if (!signal.aborted) {
        dispatch(driveActions.updateDownloadingFile({ error: (err as Error).message }));

        analytics.trackError(fileInfo);

        drive.events.emit({ event: DriveEventKey.DownloadError }, new Error(strings.errors.downloadError));
        if ((err as Error).message === ErrorCodes.MISSING_SHARDS_ERROR) {
          errorService.reportError(new Error('MISSING_SHARDS_ERROR: File  is missing shards'), {
            extra: {
              fileId,
              bucketId: user?.bucket,
            },
          });
        } else {
          errorService.reportError(err as Error, {
            extra: {
              fileId,
              bucketId: user?.bucket,
            },
          });
          // Re throw the error so Sentry middleware catchs it
          throw err;
        }
      }
    } finally {
      if (signal.aborted) {
        dispatch(driveActions.clearDownloadingFile());
        drive.events.emit({ event: DriveEventKey.CancelDownloadEnd });
      }
      drive.events.emit({ event: DriveEventKey.DownloadFinally });
    }
  },
);

const createFolderThunk = createAsyncThunk<
  void,
  { parentFolderUuid: string; newFolderName: string },
  { state: RootState }
>('drive/createFolder', async ({ parentFolderUuid, newFolderName }) => {
  await drive.folder.createFolder(parentFolderUuid, newFolderName);
});
export interface MoveItemThunkPayload {
  isFolder: boolean;
  origin: {
    name: string;
    itemId: number | string;
    parentUuid: string;
    uuid: string;
    updatedAt: string;
    createdAt: string;
  };
  destinationUuid: string;
  itemMovedAction: () => void;
  optimisticCallbacks?: {
    onOptimisticUpdate: () => void;
    onRollback: () => void;
  };
}

const moveItemThunk = createAsyncThunk<void, MoveItemThunkPayload, { state: RootState }>(
  'drive/moveItem',
  async ({ isFolder, origin, destinationUuid, itemMovedAction, optimisticCallbacks }) => {
    try {
      await drive.database.deleteItem({
        id: origin.itemId as number,
      });

      if (!isFolder) {
        await drive.file.moveFile({
          fileUuid: origin?.uuid,
          destinationFolderUuid: destinationUuid,
        });
      } else {
        await drive.folder.moveFolder({
          folderUuid: origin.uuid,
          destinationFolderUuid: destinationUuid,
        });
      }

      optimisticCallbacks?.onOptimisticUpdate();

      const totalMovedItems = 1;
      notificationsService.show({
        text1: strings.formatString(strings.messages.itemsMoved, totalMovedItems).toString(),
        action: {
          text: strings.generic.view_folder,
          onActionPress: itemMovedAction,
        },
        type: NotificationType.Success,
      });
    } catch (error) {
      optimisticCallbacks?.onRollback();
      throw error;
    }
  },
);

const loadUsageThunk = createAsyncThunk<number, void, { state: RootState }>('drive/loadUsage', async () => {
  return drive.usage.getUsage();
});

export const driveSlice = createSlice({
  name: 'drive',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setUri(state, action: PayloadAction<string | undefined>) {
      state.uri = action.payload;
    },
    setSearchString(state, action: PayloadAction<string>) {
      state.searchString = action.payload;
    },
    uploadFileStart(state, action: PayloadAction<string>) {
      state.isLoading = true;
      state.isUploading = true;
      state.isUploadingFileName = action.payload;
    },
    addUploadingFile(state, action: PayloadAction<UploadingFile>) {
      state.uploadingFiles = [...state.uploadingFiles, action.payload];
    },
    uploadingFileEnd(state, action: PayloadAction<number>) {
      state.uploadingFiles = state.uploadingFiles.filter((file) => {
        return file.id !== action.payload;
      });
    },
    clearUploadedFiles(state) {
      state.uploadingFiles = [];
    },
    uploadFileFinished(state) {
      state.isLoading = false;
      state.isUploading = false;
      state.isUploadingFileName = null;
    },

    uploadFileFailed(state, action: PayloadAction<{ errorMessage?: string; id?: number }>) {
      state.isLoading = false;
      state.isUploading = false;
      state.error = action.payload.errorMessage;
      state.uploadingFiles = state.uploadingFiles.filter((file) => file.id !== action.payload.id);
    },
    uploadFileSetProgress(state, action: PayloadAction<{ progress: number; id?: number }>) {
      if (state.uploadingFiles.length > 0) {
        const index = state.uploadingFiles.findIndex((f) => f.id === action.payload.id);

        if (state.uploadingFiles[index]) {
          state.uploadingFiles[index].progress = action.payload.progress;
        }
      }
    },
    selectItem: (state, action: PayloadAction<DriveFolderData & DriveFileData>) => {
      const isAlreadySelected =
        state.selectedItems.filter((element) => {
          const elementIsFolder = !element.fileId;

          return elementIsFolder ? action.payload.id === element.id : action.payload.fileId === element.fileId;
        }).length > 0;

      state.selectedItems = isAlreadySelected ? state.selectedItems : [...state.selectedItems, action.payload];
    },
    deselectItem(state, action: PayloadAction<DriveFolderData & DriveFileData>) {
      const itemsWithoutRemovedItem = state.selectedItems.filter((element) => {
        const elementIsFolder = !element.fileId;

        return elementIsFolder ? action.payload.id !== element.id : action.payload.fileId !== element.fileId;
      });

      state.selectedItems = itemsWithoutRemovedItem;
    },
    deselectAll(state) {
      state.selectedItems = [];
    },
    setFolderContent(state, action: PayloadAction<DriveItemData[]>) {
      state.folderContent = action.payload;
    },
    setFocusedItem(state, action: PayloadAction<DriveItemFocused | null>) {
      state.focusedItem = action.payload;
    },
    setFocusedShareItem(state, action: PayloadAction<FocusedShareItem | null>) {
      state.focusedShareItem = action.payload;
    },

    blurItem(state) {
      state.focusedItem = null;
    },
    setItemToMove(state, action: PayloadAction<DriveItemFocused | null>) {
      state.itemToMove = action.payload;
    },
    popItem(state, action: PayloadAction<{ id: number; isFolder: boolean }>) {
      state.folderContent = state.folderContent.filter(
        (item: DriveItemData) => item.id !== action.payload.id || !item.fileId !== action.payload.isFolder,
      );
    },
    pushToNavigationStack(state, action: PayloadAction<DriveNavigationStackItem>) {
      state.navigationStack.unshift(action.payload);
    },
    popFromNavigationStack(state) {
      state.navigationStack.shift();
    },
    updateDownloadingFile(state, action: PayloadAction<Partial<DownloadingFile>>) {
      state.downloadingFile && Object.assign(state.downloadingFile, action.payload);
    },
    clearDownloadingFile(state) {
      state.downloadingFile = undefined;
    },
    setRecentsStatus(state, action: PayloadAction<ThunkOperationStatus>) {
      state.recentsStatus = action.payload;
    },
    setRecents(state, action: PayloadAction<DriveFileData[]>) {
      state.recents = action.payload;
    },
    setCurrentFolderId(state, action: PayloadAction<number>) {
      state.currentFolderId = action.payload;
    },
    hideItemsById(state, action: PayloadAction<string[]>) {
      state.hiddenItemsIds = [...new Set(state.hiddenItemsIds.concat(action.payload))];
    },
    resetHiddenItems(state) {
      state.hiddenItemsIds = [];
    },

    removeHiddenItemsById(state, action: PayloadAction<string[]>) {
      state.hiddenItemsIds = state.hiddenItemsIds.filter((id) => !action.payload.includes(id));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state) => {
        state.isInitialized = false;
      })
      .addCase(initializeThunk.fulfilled, (state) => {
        state.isInitialized = true;
      })
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(downloadFileThunk.pending, (state, action) => {
        state.downloadingFile = {
          data: action.meta.arg,
          status: 'idle',
          downloadProgress: 0,
          decryptProgress: 0,
        };
      })
      .addCase(downloadFileThunk.fulfilled, () => undefined)
      .addCase(downloadFileThunk.rejected, (_, action) => {
        const errorCode = action.payload;
        if (errorCode === DOWNLOAD_ERROR_CODES.MAX_SIZE_TO_DOWNLOAD_REACHED) {
          notificationsService.info(strings.messages.downloadLimit);
        }
      });

    builder
      .addCase(createFolderThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createFolderThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.selectedItems = [];
      })
      .addCase(createFolderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    builder
      .addCase(moveItemThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(moveItemThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(moveItemThunk.rejected, (state, action) => {
        state.isLoading = false;

        notificationsService.show({
          text1: action.error.message || strings.errors.unknown,
          type: NotificationType.Error,
        });
      });

    builder.addCase(loadUsageThunk.fulfilled, (state, action) => {
      state.usage = action.payload;
    });

    builder.addCase(getRecentsThunk.rejected, (state) => {
      state.recentsStatus = ThunkOperationStatus.ERROR;
    });
    builder.addCase(getRecentsThunk.fulfilled, (state) => {
      state.recentsStatus = ThunkOperationStatus.SUCCESS;
    });
  },
});

export const driveSelectors = {
  absolutePath: (state: RootState) => {
    return state.drive.navigationStack.reduce((result, item) => result + item.name + '/', '/');
  },
  navigationStackPeek: (state: RootState) => {
    return state.drive.navigationStack.length > 0
      ? state.drive.navigationStack[0]
      : { id: state.auth.user?.rootFolderId ?? null, name: '', parentId: null, updatedAt: Date.now().toString() };
  },
  driveItems(state: RootState): { uploading: DriveListItem[]; items: DriveListItem[] } {
    const { folderContent, uploadingFiles, searchString, currentFolderId } = state.drive;
    const bucket = state.auth.user?.bucket;

    if (!bucket) throw new Error('Bucket not found');
    let items = folderContent;

    if (searchString) {
      items = items.filter((item) => item.name.toLowerCase().includes(searchString.toLowerCase()));
    }

    items = items.slice().sort((a, b) => {
      const aValue = a.fileId ? 1 : 0;
      const bValue = b.fileId ? 1 : 0;

      return aValue - bValue;
    });

    return {
      uploading: uploadingFiles.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Uploading,
        progress: f.progress,
        data: {
          bucket: bucket,
          folderId: currentFolderId,
          // TODO: Organize Drive item types
          thumbnails: [],
          currentThumbnail: null,

          isFolder: false,
          ...f,
        },
        id: f.id.toString(),
      })),
      items: items.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Idle,
        data: {
          ...f,
          isFolder: f.fileId ? false : true,
        },
        id: f.id.toString(),
      })),
    };
  },
};

export const driveActions = driveSlice.actions;

export const driveThunks = {
  initializeThunk,
  cancelDownloadThunk,
  downloadFileThunk,
  createFolderThunk,
  moveItemThunk,
  loadUsageThunk,
  getRecentsThunk,
};

export default driveSlice.reducer;
