import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DriveFileData, DriveFolderData, FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';

import analytics, { AnalyticsEventKey } from '../../../services/analytics';
import fileService from '../../../services/file';
import folderService from '../../../services/folder';
import { DevicePlatform, NotificationType } from '../../../types';
import { RootState } from '../..';
import { uiActions } from '../ui';
import { loadValues } from '../../../services/storage';
import { asyncStorage } from '../../../services/asyncStorage';
import strings from '../../../../assets/lang/strings';
import { getEnvironmentConfig } from '../../../lib/network';
import notificationsService from '../../../services/notifications';
import {
  DriveFileMetadataPayload,
  DriveFolderMetadataPayload,
  DriveItemData,
  DriveItemStatus,
  DriveListItem,
  SortDirection,
  SortType,
  UploadingFile,
  DownloadingFile,
  DriveEventKey,
} from '../../../types/drive';
import {
  createEmptyFile,
  exists,
  getDocumentsDir,
  pathToUri,
  showFileViewer,
} from '../../../services/fileSystem';
import { items } from '@internxt/lib';
import network from '../../../network';
import driveService from '../../../services/drive';
import _ from 'lodash';


export interface DriveState {
  isLoading: boolean;
  absolutePath: string;
  items: DriveItemData[];
  uploadingFiles: UploadingFile[];
  downloadingFile?: DownloadingFile;
  selectedItems: DriveItemData[];
  currentFolderId: number;
  currentFolderName: string;
  parentFolderId: number | null;
  folderContent: DriveItemData[];
  folderContentResponse: FetchFolderContentResponse | null;
  focusedItem: DriveItemData | null;
  sortType: SortType;
  sortDirection: SortDirection;
  searchString: string;
  isUploading: boolean;
  isUploadingFileName: string | null;
  uploadFileUri: string | undefined | null;
  progress: number;
  error?: string | null;
  uri?: any;
  pendingDeleteItems: { [key: string]: boolean };
  selectedFile: any;
  usage: number;
  limit: number;
}

const initialState: DriveState = {
  isLoading: false,
  items: [],
  currentFolderName: '',
  currentFolderId: -1,
  parentFolderId: null,
  folderContentResponse: null,
  folderContent: [],
  focusedItem: null,
  absolutePath: '/',
  uploadingFiles: [],
  downloadingFile: undefined,
  selectedItems: [],
  sortType: SortType.Name,
  sortDirection: SortDirection.Asc,
  searchString: '',
  isUploading: false,
  isUploadingFileName: '',
  uploadFileUri: '',
  progress: 0,
  uri: undefined,
  pendingDeleteItems: {},
  selectedFile: null,
  usage: 0,
  limit: 0,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'drive/initialize',
  async (payload, { dispatch }) => {
    const user = await asyncStorage.getUser();

    if (user) {
      await dispatch(getUsageAndLimitThunk());
    }
  },
);

const getFolderContentThunk = createAsyncThunk<
  {
    currentFolderId: number;
    currentFolderName: string;
    parentFolderId: number | null;
    folderContent: DriveItemData[];
    folderContentResponse: FetchFolderContentResponse | null;
  },
  { folderId: number },
  { state: RootState }
>('drive/getFolderContent', async ({ folderId }, { dispatch }) => {
  const folderContentPromise = fileService.getFolderContent(folderId);
  // const isFolderInDatabase = await driveService.localDatabaseService.isFolderInDatabase(folderId);
  const isFolderInDatabase = false;

  if (isFolderInDatabase) {
    const folderContent = await driveService.localDatabaseService.getDriveItems(folderId);

    dispatch(driveThunks.getFolderContentThunk({ folderId }));

    return {
      currentFolderId: folderId,
      currentFolderName: '',
      parentFolderId: null,
      folderContent,
      folderContentResponse: null,
    };
  } else {
    const response = await folderContentPromise;
    const folders = response.children.map((folder) => ({ ...folder, isFolder: true }));
    const folderContent = _.concat(folders as unknown as DriveItemData[], response.files as DriveItemData[]);

    return {
      currentFolderId: folderId,
      currentFolderName: response.name,
      parentFolderId: response.parentId,
      folderContent,
      folderContentResponse: response,
    };
  }
});

const getUsageAndLimitThunk = createAsyncThunk<{ usage: number; limit: number }, void, { state: RootState }>(
  'drive/getUsageAndLimit',
  async () => {
    return loadValues();
  },
);

const goBackThunk = createAsyncThunk<void, { folderId: number }, { state: RootState }>(
  'drive/goBack',
  async ({ folderId }, { dispatch }) => {
    dispatch(uiActions.setBackButtonEnabled(false));

    dispatch(getFolderContentThunk({ folderId })).finally(() => {
      dispatch(driveActions.removeDepthAbsolutePath(1));
      dispatch(uiActions.setBackButtonEnabled(true));
    });
  },
);

const cancelDownloadThunk = createAsyncThunk<void, void, { state: RootState }>('drive/cancelDownload', () => {
  driveService.eventEmitter.emit({ event: DriveEventKey.CancelDownload });
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
          user: user.bridgeUser
        },
        {
          toPath: params.to,
          downloadProgressCallback,
          decryptionProgressCallback,
          signal,
        },
        (abortable) => {
          driveService.eventEmitter.setLegacyAbortable(abortable);
        }
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

      const destinationDir = await getDocumentsDir();
      let destinationPath = destinationDir + '/' + name + (type ? '.' + type : '');
      const fileAlreadyExists = await exists(destinationPath);

      if (fileAlreadyExists) {
        destinationPath = destinationDir + '/' + name + '-' + Date.now().toString() + (type ? '.' + type : '');
      }

      await createEmptyFile(destinationPath);

      if (signal.aborted) {
        return rejectWithValue(null);
      }

      await download({ fileId, to: destinationPath });

      const uri = pathToUri(destinationPath);

      await showFileViewer(uri, { displayName: items.getItemDisplayName({ name, type }) });
      trackDownloadSuccess();
    } catch (err) {
      if (!signal.aborted) {
        driveService.eventEmitter.emit({ event: DriveEventKey.DownloadError }, err);
      }
    } finally {
      if (signal.aborted) {
        driveService.eventEmitter.emit({ event: DriveEventKey.CancelDownloadEnd });
      }
      driveService.eventEmitter.emit({ event: DriveEventKey.DownloadFinally });
    }
  },
);

const updateFileMetadataThunk = createAsyncThunk<
  void,
  { file: DriveFileData; metadata: DriveFileMetadataPayload },
  { state: RootState }
>('drive/updateFileMetadata', async ({ file, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { absolutePath, focusedItem } = getState().drive;
  const itemFullName = `${metadata.itemName}${focusedItem?.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  return fileService.updateMetaData(file.fileId, metadata, bucketId, itemPath);
});

const updateFolderMetadataThunk = createAsyncThunk<
  void,
  { folder: DriveFolderData; metadata: DriveFolderMetadataPayload },
  { state: RootState }
>('drive/updateFolderMetadata', async ({ folder, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { absolutePath, focusedItem } = getState().drive;
  const itemFullName = `${metadata.itemName}${focusedItem?.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  folderService.updateMetaData(folder.id, metadata, bucketId, itemPath);
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

const moveFileThunk = createAsyncThunk<void, { fileId: string; destinationFolderId: number }, { state: RootState }>(
  'drive/moveFile',
  async ({ fileId, destinationFolderId }, { dispatch }) => {
    await fileService.moveFile(fileId, destinationFolderId);
    dispatch(getFolderContentThunk({ folderId: destinationFolderId }));
  },
);

const deleteItemsThunk = createAsyncThunk<void, { items: any[]; folderToReload: number }, { state: RootState }>(
  'drive/deleteItems',
  async ({ items, folderToReload }, { dispatch }) => {
    dispatch(getFolderContentThunk({ folderId: folderToReload }));

    notificationsService.show({
      text1: strings.messages.itemsDeleted,
      type: NotificationType.Success,
    });

    await fileService
      .deleteItems(items)
      .then(() => {
        dispatch(getUsageAndLimitThunk());
      })
      .catch((err) => {
        notificationsService.show({
          text1: err.message,
          type: NotificationType.Error,
        });
        throw err;
      })
      .finally(() => {
        setTimeout(() => {
          dispatch(getFolderContentThunk({ folderId: folderToReload }));
        }, 1000);
      });
  },
);

export const driveSlice = createSlice({
  name: 'drive',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setCurrentFolderId(state, action: PayloadAction<number>) {
      state.currentFolderId = action.payload;
    },
    setSortType(state, action: PayloadAction<SortType>) {
      state.sortType = action.payload;
    },
    setSortDirection(state, action: PayloadAction<SortDirection>) {
      state.sortDirection = action.payload;
    },
    setUri(state, action: PayloadAction<any>) {
      if (action.payload) {
        asyncStorage.getUser().then((user) => {
          analytics.track(AnalyticsEventKey.ShareTo, {
            email: user.email,
            uri: action.payload.fileUri ? action.payload.fileUri : action.payload.toString && action.payload.toString(),
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
    focusItem(state, action: PayloadAction<any>) {
      state.focusedItem = action.payload;
    },
    blurItem(state) {
      state.focusedItem = null;
    },
    addDepthAbsolutePath(state, action: PayloadAction<string[]>) {
      state.absolutePath = action.payload.reduce((acumm, depth) => acumm + depth + '/', state.absolutePath);
    },
    removeDepthAbsolutePath(state, action: PayloadAction<number>) {
      const pathSplitted = state.absolutePath.split('/');

      state.absolutePath = pathSplitted.slice(0, pathSplitted.length - (action.payload + 1)).join('/') + '/' || '/';
    },
    updateDownloadingFile(state, action: PayloadAction<Partial<DownloadingFile>>) {
      Object.assign(state.downloadingFile, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(getUsageAndLimitThunk.pending, () => undefined)
      .addCase(getUsageAndLimitThunk.fulfilled, (state, action) => {
        state.usage = action.payload.usage;
        state.limit = action.payload.limit;
      })
      .addCase(getUsageAndLimitThunk.rejected, () => undefined);

    builder
      .addCase(getFolderContentThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getFolderContentThunk.fulfilled, (state, action) => {
        action.payload.folderContent = action.payload.folderContent.filter((item) => {
          return !state.pendingDeleteItems[item.id.toString()];
        });
        action.payload.folderContent = action.payload.folderContent.filter((item) => {
          return !state.pendingDeleteItems[item.fileId];
        });

        state.isLoading = false;
        state.currentFolderId = action.payload.currentFolderId;
        state.currentFolderName = action.payload.currentFolderName;
        state.parentFolderId = action.payload.parentFolderId;
        state.folderContent = action.payload.folderContent;
        state.folderContentResponse = action.payload.folderContentResponse;
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
      .addCase(moveFileThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(moveFileThunk.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(moveFileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
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
  },
});

export const storageSelectors = {
  driveItems(state: RootState): DriveListItem[] {
    const { folderContent, uploadingFiles, searchString, sortType, sortDirection } = state.drive;
    const sortFunction = fileService.getSortFunction({ type: sortType, direction: sortDirection });
    let items = folderContent;

    if (searchString) {
      items = items.filter((item) => item.name.toLowerCase().includes(searchString.toLowerCase()));
    }

    items = items.slice().sort(sortFunction);
    items = items.slice().sort((a, b) => {
      const aValue = a.fileId ? 1 : 0;
      const bValue = b.fileId ? 1 : 0;

      return aValue - bValue;
    });

    return [
      ...uploadingFiles.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Uploading,
        progress: f.progress,
        data: {
          ...f,
        },
      })),
      ...items.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Idle,
        data: f,
      })),
    ];
  },
};

export const driveActions = driveSlice.actions;

export const driveThunks = {
  initializeThunk,
  getUsageAndLimitThunk,
  getFolderContentThunk,
  goBackThunk,
  cancelDownloadThunk,
  downloadFileThunk,
  updateFileMetadataThunk,
  updateFolderMetadataThunk,
  createFolderThunk,
  moveFileThunk,
  deleteItemsThunk,
};

export default driveSlice.reducer;
