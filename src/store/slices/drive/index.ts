import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

import analytics, { AnalyticsEventKey } from '../../../services/AnalyticsService';
import fileService from '../../../services/DriveFileService';
import folderService from '../../../services/DriveFolderService';
import { AsyncStorageKey, DevicePlatform, NotificationType } from '../../../types';
import { RootState } from '../..';
import { uiActions } from '../ui';
import asyncStorage from '../../../services/AsyncStorageService';
import strings from '../../../../assets/lang/strings';
import { getEnvironmentConfig } from '../../../lib/network';
import notificationsService from '../../../services/NotificationsService';
import {
  DriveFileMetadataPayload,
  DriveFolderMetadataPayload,
  DriveItemData,
  DriveItemStatus,
  DriveListItem,
  UploadingFile,
  DownloadingFile,
  DriveEventKey,
  DriveNavigationStack,
  DriveNavigationStackItem,
  DriveItemFocused,
} from '../../../types/drive';
import fileSystemService from '../../../services/FileSystemService';
import { items } from '@internxt/lib';
import network from '../../../network';
import _ from 'lodash';
import DriveService from '../../../services/DriveService';

export interface DriveState {
  isInitialized: boolean;
  isLoading: boolean;
  navigationStack: DriveNavigationStack;
  items: DriveItemData[];
  uploadingFiles: UploadingFile[];
  downloadingFile?: DownloadingFile;
  selectedItems: DriveItemData[];
  folderContent: DriveItemData[];
  focusedItem: DriveItemFocused;
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
}

const initialState: DriveState = {
  isInitialized: false,
  navigationStack: [],
  isLoading: false,
  items: [],
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
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'drive/initialize',
  async (payload, { dispatch }) => {
    const accessToken = await asyncStorage.getItem(AsyncStorageKey.Token);
    const user = await asyncStorage.getUser();

    if (user && accessToken) {
      DriveService.initialize(accessToken);

      dispatch(loadUsageThunk());
    }
  },
);

const navigateToFolderThunk = createAsyncThunk<void, DriveNavigationStackItem, { state: RootState }>(
  'drive/navigateToFolder',
  async (stackItem, { dispatch, getState }) => {
    const { user } = getState().auth;

    dispatch(driveActions.pushToNavigationStack(stackItem));
    dispatch(driveThunks.getFolderContentThunk({ folderId: stackItem.id }));
    analytics.track(AnalyticsEventKey.FolderOpened, {
      folder_id: stackItem.id,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  },
);

const getFolderContentThunk = createAsyncThunk<
  {
    focusedItem: DriveItemFocused;
    folderContent: DriveItemData[];
  },
  { folderId: number },
  { state: RootState }
>('drive/getFolderContent', async ({ folderId }, { dispatch }) => {
  const folderRecord = await DriveService.instance.localDatabase.getFolderRecord(folderId);
  const folderContentPromise = fileService.getFolderContent(folderId);
  const getFolderContent = async () => {
    const response = await folderContentPromise;
    const folders = response.children.map((folder) => ({ ...folder }));
    const folderContent = _.concat(folders as unknown as DriveItemData[], response.files as DriveItemData[]);

    return { response, folderContent };
  };

  if (folderRecord) {
    getFolderContent().then(({ response, folderContent }) => {
      DriveService.instance.localDatabase.saveFolderContent(response, folderContent);

      dispatch(
        driveActions.setFocusedItem({
          id: response.id,
          name: response.name,
          parentId: response.parentId,
          updatedAt: response.updatedAt,
        }),
      );
      dispatch(driveActions.setFolderContent(folderContent));
    });

    const folderContent = await DriveService.instance.localDatabase.getDriveItems(folderId);

    return {
      focusedItem: {
        id: folderRecord.id,
        name: folderRecord.name,
        parentId: folderRecord.parent_id,
        updatedAt: folderRecord.updated_at,
      },
      folderContent,
    };
  } else {
    const { response, folderContent } = await getFolderContent();

    DriveService.instance.localDatabase.saveFolderContent(response, folderContent);

    return {
      focusedItem: {
        id: response.id,
        name: response.name,
        parentId: response.parentId,
        updatedAt: response.updatedAt,
      },
      folderContent,
    };
  }
});

const goBackThunk = createAsyncThunk<void, { folderId: number }, { state: RootState }>(
  'drive/goBack',
  async ({ folderId }, { dispatch }) => {
    dispatch(uiActions.setBackButtonEnabled(false));

    dispatch(getFolderContentThunk({ folderId })).finally(() => {
      dispatch(driveActions.popFromNavigationStack());
      dispatch(uiActions.setBackButtonEnabled(true));
    });
  },
);

const cancelDownloadThunk = createAsyncThunk<void, void, { state: RootState }>('drive/cancelDownload', () => {
  DriveService.instance.eventEmitter.emit({ event: DriveEventKey.CancelDownload });
});

const downloadFileThunk = createAsyncThunk<
  void,
  { id: number; size: number; parentId: number; name: string; type: string; fileId: string; updatedAt: string },
  { state: RootState }
>(
  'drive/downloadFile',
  async ({ id, size, parentId, name, type, fileId }, { signal, getState, dispatch, rejectWithValue }) => {
    const { user } = getState().auth;
    const downloadProgressCallback = (progress: number) => {
      dispatch(
        driveActions.updateDownloadingFile({
          downloadProgress: progress,
        }),
      );
    };
    const decryptionProgressCallback = (progress: number) => {
      if (signal.aborted) {
        return;
      }

      dispatch(
        driveActions.updateDownloadingFile({
          decryptProgress: Math.max(getState().drive.downloadingFile?.downloadProgress || 0, progress),
        }),
      );
    };

    const download = (params: { fileId: string; to: string }) => {
      if (!user) {
        return;
      }

      return network.downloadFile(
        params.fileId,
        user?.bucket,
        user.mnemonic,
        {
          pass: user.userId,
          user: user.bridgeUser,
        },
        {
          toPath: params.to,
          downloadProgressCallback,
          decryptionProgressCallback,
          signal,
        },
        (abortable) => {
          DriveService.instance.eventEmitter.setLegacyAbortable(abortable);
        },
      );
    };

    const trackDownloadStart = () => {
      return analytics.track(AnalyticsEventKey.FileDownloadStart, {
        file_id: id,
        file_size: size || 0,
        file_type: type || '',
        folder_id: parentId || null,
        platform: DevicePlatform.Mobile,
        email: user?.email || null,
        userId: user?.uuid || null,
      });
    };
    const trackDownloadSuccess = () => {
      return analytics.track(AnalyticsEventKey.FileDownloadFinished, {
        file_id: id,
        file_size: size || 0,
        file_type: type || '',
        folder_id: parentId || null,
        platform: DevicePlatform.Mobile,
        email: user?.email || null,
        userId: user?.uuid || null,
      });
    };

    try {
      dispatch(uiActions.setIsDriveDownloadModalOpen(true));
      trackDownloadStart();
      downloadProgressCallback(0);

      const destinationDir = await fileSystemService.getDocumentsDir();
      let destinationPath = destinationDir + '/' + name + (type ? '.' + type : '');
      const fileAlreadyExists = await fileSystemService.exists(destinationPath);

      if (fileAlreadyExists) {
        destinationPath = destinationDir + '/' + name + '-' + Date.now().toString() + (type ? '.' + type : '');
      }

      await fileSystemService.createEmptyFile(destinationPath);

      if (signal.aborted) {
        return rejectWithValue(null);
      }

      await download({ fileId, to: destinationPath });

      const uri = fileSystemService.pathToUri(destinationPath);

      await fileSystemService.showFileViewer(uri, { displayName: items.getItemDisplayName({ name, type }) });
      trackDownloadSuccess();
    } catch (err) {
      if (!signal.aborted) {
        DriveService.instance.eventEmitter.emit({ event: DriveEventKey.DownloadError }, err);
      }
    } finally {
      if (signal.aborted) {
        DriveService.instance.eventEmitter.emit({ event: DriveEventKey.CancelDownloadEnd });
      }
      DriveService.instance.eventEmitter.emit({ event: DriveEventKey.DownloadFinally });
    }
  },
);

const updateFileMetadataThunk = createAsyncThunk<
  void,
  { fileId: string; metadata: DriveFileMetadataPayload },
  { state: RootState }
>('drive/updateFileMetadata', async ({ fileId, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { focusedItem } = getState().drive;
  const absolutePath = driveSelectors.absolutePath(getState());
  const itemFullName = `${metadata.itemName}${focusedItem?.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  return fileService.updateMetaData(fileId, metadata, bucketId, itemPath);
});

const updateFolderMetadataThunk = createAsyncThunk<
  void,
  { folderId: number; metadata: DriveFolderMetadataPayload },
  { state: RootState }
>('drive/updateFolderMetadata', async ({ folderId, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { focusedItem } = getState().drive;
  const absolutePath = driveSelectors.absolutePath(getState());
  const itemFullName = `${metadata.itemName}${focusedItem?.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  folderService.updateMetaData(folderId, metadata, bucketId, itemPath);
});

const createFolderThunk = createAsyncThunk<
  void,
  { parentFolderId: number; newFolderName: string },
  { state: RootState }
>('drive/createFolder', async ({ parentFolderId, newFolderName }, { dispatch }) => {
  await folderService.createFolder(parentFolderId, newFolderName);
  const userData = await asyncStorage.getUser();

  await analytics.track(AnalyticsEventKey.FolderCreated, {
    userId: userData.uuid,
    platform: DevicePlatform.Mobile,
    email: userData.email,
  });

  await dispatch(getFolderContentThunk({ folderId: parentFolderId }));
});

export interface MoveItemThunkPayload {
  isFolder: boolean;
  origin: {
    name: string;
    itemId: number | string;
    parentId: number;
    id: number;
    updatedAt: string;
    createdAt: string;
  };
  destination: number;
  itemMovedAction: () => void;
}

const moveItemThunk = createAsyncThunk<void, MoveItemThunkPayload, { state: RootState }>(
  'drive/moveItem',
  async ({ isFolder, origin, destination, itemMovedAction }, { getState }) => {
    const { user, token } = getState().auth;

    folderService.initialize(token, user?.mnemonic || '');

    if (!isFolder) {
      await fileService.moveFile({
        fileId: origin?.itemId as string,
        destination: destination,
      });
    } else {
      await folderService.moveFolder({
        folderId: origin.itemId as number,
        destinationFolderId: destination,
      });
    }

    await DriveService.instance.localDatabase.deleteItem({
      id: origin.itemId as number,
      isFolder: isFolder,
    });

    const totalMovedItems = 1;
    notificationsService.show({
      text1: strings.formatString(strings.messages.itemsMoved, totalMovedItems).toString(),
      action: {
        text: strings.generic.view_folder,
        onActionPress: itemMovedAction,
      },
      type: NotificationType.Success,
    });
  },
);

const deleteItemsThunk = createAsyncThunk<void, { items: any[] }, { state: RootState }>(
  'drive/deleteItems',
  async ({ items }, { dispatch }) => {
    notificationsService.show({
      text1: strings.messages.itemsDeleted,
      type: NotificationType.Success,
    });

    await fileService
      .deleteItems(items)
      .then(() => {
        dispatch(loadUsageThunk());
        for (const item of items) {
          dispatch(driveActions.popItem({ id: item.id, isFolder: !item.fileId }));
          DriveService.instance.localDatabase.deleteItem({ id: item.id, isFolder: !item.fileId });
        }
      })
      .catch((err) => {
        notificationsService.show({
          text1: err.message,
          type: NotificationType.Error,
        });
        throw err;
      });
  },
);

const clearLocalDatabaseThunk = createAsyncThunk<void, void, { state: RootState }>(
  'drive/clearLocalDatabase',
  async () => {
    DriveService.instance.localDatabase.resetDatabase();
  },
);

const loadUsageThunk = createAsyncThunk<number, void, { state: RootState }>('drive/loadUsage', async () => {
  return DriveService.instance.usage.getUsage();
});

export const driveSlice = createSlice({
  name: 'drive',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setUri(state, action: PayloadAction<string | undefined>) {
      if (action.payload) {
        asyncStorage.getUser().then((user) => {
          analytics.track(AnalyticsEventKey.ShareTo, {
            email: user.email,
            uri: action.payload || '',
          });
        });
      }

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
      state.uploadingFiles = state.uploadingFiles.filter((file) => file.id !== action.payload);
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
      .addCase(navigateToFolderThunk.pending, () => undefined)
      .addCase(navigateToFolderThunk.fulfilled, () => undefined)
      .addCase(navigateToFolderThunk.rejected, () => undefined);

    builder
      .addCase(getFolderContentThunk.pending, (state) => {
        state.isLoading = true;
        state.folderContent = [];
      })
      .addCase(getFolderContentThunk.fulfilled, (state, action) => {
        action.payload.folderContent = action.payload.folderContent.filter((item) => {
          return !state.pendingDeleteItems[item.id.toString()];
        });
        action.payload.folderContent = action.payload.folderContent.filter((item) => {
          return !state.pendingDeleteItems[item.fileId];
        });

        state.isLoading = false;
        state.folderContent = action.payload.folderContent;
        state.focusedItem = action.payload.focusedItem;
        state.selectedItems = [];
      })
      .addCase(getFolderContentThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });

    builder
      .addCase(goBackThunk.pending, () => undefined)
      .addCase(goBackThunk.fulfilled, () => undefined)
      .addCase(goBackThunk.rejected, () => undefined);

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
      .addCase(downloadFileThunk.rejected, () => undefined);

    builder
      .addCase(updateFileMetadataThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateFileMetadataThunk.fulfilled, () => undefined)
      .addCase(updateFileMetadataThunk.rejected, () => undefined);

    builder
      .addCase(updateFolderMetadataThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateFolderMetadataThunk.fulfilled, () => undefined)
      .addCase(updateFolderMetadataThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
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

    builder
      .addCase(deleteItemsThunk.pending, (state, action) => {
        state.isLoading = true;
        action.meta.arg.items.forEach((item) => {
          if (item.fileId) {
            state.pendingDeleteItems[item.fileId] = true;
          } else {
            state.pendingDeleteItems[item.id] = true;
          }
        });
      })
      .addCase(deleteItemsThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.pendingDeleteItems = {};
      })
      .addCase(deleteItemsThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.pendingDeleteItems = {};
        state.error = action.error.message;
      });

    builder.addCase(loadUsageThunk.fulfilled, (state, action) => {
      state.usage = action.payload;
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
      : { id: state.auth.user?.root_folder_id || -1, name: '', parentId: null, updatedAt: Date.now().toString() };
  },
  driveItems(state: RootState): { uploading: DriveListItem[]; items: DriveListItem[] } {
    const { folderContent, uploadingFiles, searchString } = state.drive;

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
          ...f,
        },
      })),
      items: items.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Idle,
        data: f,
      })),
    };
  },
};

export const driveActions = driveSlice.actions;

export const driveThunks = {
  initializeThunk,
  navigateToFolderThunk,
  getFolderContentThunk,
  goBackThunk,
  cancelDownloadThunk,
  downloadFileThunk,
  updateFileMetadataThunk,
  updateFolderMetadataThunk,
  createFolderThunk,
  moveItemThunk,
  deleteItemsThunk,
  clearLocalDatabaseThunk,
  loadUsageThunk,
};

export default driveSlice.reducer;
