import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { IFile, IFolder, IUploadingFile } from '../../../components/FileList';
import analytics, { getAnalyticsData } from '../../../services/analytics';
import { notify } from '../../../services/toast';
import fileService from '../../../services/file';
import folderService from '../../../services/folder';

import {
  DevicePlatform,
  DriveFileMetadataPayload,
  DriveFolderMetadataPayload,
  SortDirection,
  SortType,
} from '../../../types';
import { RootState } from '../..';
import { layoutActions } from '../layout';
import { loadValues } from '../../../services/storage';
import { deviceStorage } from '../../../services/asyncStorage';
import strings from '../../../../assets/lang/strings';
import { getEnvironmentConfig } from '../../../lib/network';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

interface FolderContent {
  id: number;
  name: string;
  bucket: string;
  encrypt_version: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  userId: number | null;
  iconId: number | null;
  parentId: number | null;
  children: IFolder[];
  files: IFile[];
}

export interface StorageState {
  isLoading: boolean;
  items: any[];
  absolutePath: string;
  filesCurrentlyUploading: IUploadingFile[];
  filesAlreadyUploaded: any[];
  currentFolderId: number;
  folderContent: FolderContent | null;
  rootFolderContent: any;
  focusedItem: any | null;
  selectedItems: any[];
  sortType: SortType;
  sortDirection: SortDirection;
  searchString: string;
  isUploading: boolean;
  isUploadingFileName: string | null;
  uploadFileUri: string | undefined | null;
  progress: number;
  startDownloadSelectedFile: boolean;
  error?: string | null;
  uri?: any;
  pendingDeleteItems: { [key: string]: boolean };
  selectedFile: any;
  usage: number;
  limit: number;
}

const initialState: StorageState = {
  isLoading: false,
  items: [],
  currentFolderId: -1,
  absolutePath: '/',
  filesCurrentlyUploading: [],
  filesAlreadyUploaded: [],
  folderContent: null,
  rootFolderContent: [],
  focusedItem: null,
  selectedItems: [],
  sortType: SortType.Name,
  sortDirection: SortDirection.Asc,
  searchString: '',
  isUploading: false,
  isUploadingFileName: '',
  uploadFileUri: '',
  progress: 0,
  startDownloadSelectedFile: false,
  uri: undefined,
  pendingDeleteItems: {},
  selectedFile: null,
  usage: 0,
  limit: 0,
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'files/initialize',
  async (payload, { dispatch }) => {
    const user = await deviceStorage.getUser();

    if (user) {
      await dispatch(getUsageAndLimitThunk());
    }
  },
);

const getFolderContentThunk = createAsyncThunk<
  { currentFolderId: number; folderContent: FolderContent },
  { folderId: number; quick?: boolean },
  { state: RootState }
>('files/getFolderContent', async ({ folderId }) => {
  const folderContent = await fileService.getFolderContent(folderId);

  return { currentFolderId: folderId, folderContent };
});

const getUsageAndLimitThunk = createAsyncThunk<{ usage: number; limit: number }, void, { state: RootState }>(
  'files/getUsageAndLimit',
  async () => {
    return loadValues();
  },
);

const goBackThunk = createAsyncThunk<void, { folderId: number }, { state: RootState }>(
  'files/goBack',
  async ({ folderId }, { dispatch }) => {
    dispatch(layoutActions.setBackButtonEnabled(false));

    dispatch(getFolderContentThunk({ folderId })).finally(() => {
      dispatch(storageActions.removeDepthAbsolutePath(1));
      dispatch(layoutActions.setBackButtonEnabled(true));
    });
  },
);

const updateFileMetadataThunk = createAsyncThunk<
  void,
  { file: DriveFileData; metadata: DriveFileMetadataPayload },
  { state: RootState }
>('files/updateFileMetadata', async ({ file, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { absolutePath, focusedItem } = getState().storage;
  const itemFullName = `${metadata.itemName}${focusedItem.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  return fileService.updateMetaData(file.fileId, metadata, bucketId, itemPath);
});

const updateFolderMetadataThunk = createAsyncThunk<
  void,
  { folder: DriveFolderData; metadata: DriveFolderMetadataPayload },
  { state: RootState }
>('files/updateFolderMetadata', async ({ folder, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { absolutePath, focusedItem } = getState().storage;
  const itemFullName = `${metadata.itemName}${focusedItem.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  folderService.updateMetaData(folder.id, metadata, bucketId, itemPath);
});

const createFolderThunk = createAsyncThunk<
  void,
  { parentFolderId: number; newFolderName: string },
  { state: RootState }
>('files/createFolder', async ({ parentFolderId, newFolderName }, { dispatch }) => {
  await fileService.createFolder(parentFolderId, newFolderName);
  const userData = await getAnalyticsData();

  await analytics.track('folder-created', {
    userId: userData.uuid,
    platform: DevicePlatform.Mobile,
    email: userData.email,
  });

  await dispatch(getFolderContentThunk({ folderId: parentFolderId }));
});

const moveFileThunk = createAsyncThunk<void, { fileId: string; destinationFolderId: number }, { state: RootState }>(
  'files/moveFile',
  async ({ fileId, destinationFolderId }, { dispatch }) => {
    await fileService.moveFile(fileId, destinationFolderId);
    dispatch(getFolderContentThunk({ folderId: destinationFolderId }));
  },
);

const deleteItemsThunk = createAsyncThunk<void, { items: any[]; folderToReload: number }, { state: RootState }>(
  'files/deleteItems',
  async ({ items, folderToReload }, { dispatch }) => {
    dispatch(getFolderContentThunk({ folderId: folderToReload }));

    notify({
      text: strings.messages.itemsDeleted,
      type: 'success',
    });

    await fileService
      .deleteItems(items)
      .then(() => {
        dispatch(getUsageAndLimitThunk());
      })
      .catch((err) => {
        notify({
          text: err.message,
          type: 'error',
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

export const storageSlice = createSlice({
  name: 'storage',
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
        getAnalyticsData().then((user) => {
          analytics.track('share-to', {
            email: user.email,
            uri: action.payload.fileUri ? action.payload.fileUri : action.payload.toString && action.payload.toString(),
          });
        });
      }

      state.uri = action.payload;
    },
    updateUploadingFile(state, action: PayloadAction<string>) {
      state.filesAlreadyUploaded = state.filesAlreadyUploaded.map((file) =>
        file.id === action.payload ? { ...file, isUploaded: true } : file,
      );
    },
    setRootFolderContent(state, action: PayloadAction<any>) {
      state.rootFolderContent = action.payload;
    },
    setSearchString(state, action: PayloadAction<string>) {
      state.searchString = action.payload;
    },
    uploadFileStart(state, action: PayloadAction<string>) {
      state.isLoading = true;
      state.isUploading = true;
      state.isUploadingFileName = action.payload;
    },
    downloadSelectedFileStart(state) {
      state.startDownloadSelectedFile = true;
    },
    downloadSelectedFileStop(state) {
      state.startDownloadSelectedFile = false;
    },
    addUploadingFile(state, action: PayloadAction<any>) {
      state.filesCurrentlyUploading = [...state.filesCurrentlyUploading, action.payload];
    },
    removeUploadingFile(state, action: PayloadAction<string>) {
      state.filesAlreadyUploaded = [
        ...state.filesAlreadyUploaded,
        state.filesCurrentlyUploading.find((file) => file.id === action.payload),
      ];
      state.filesCurrentlyUploading = state.filesCurrentlyUploading.filter((file) => file.id !== action.payload);
    },
    uploadFileFinished(state) {
      state.isLoading = false;
      state.isUploading = false;
      state.isUploadingFileName = null;
    },
    uploadFileFailed(state, action: PayloadAction<{ errorMessage?: string; id?: string }>) {
      state.isLoading = false;
      state.isUploading = false;
      state.error = action.payload.errorMessage;
      state.filesCurrentlyUploading = state.filesCurrentlyUploading.filter((file) => file.id !== action.payload.id);
    },
    uploadFileSetProgress(state, action: PayloadAction<{ progress: number; id?: string }>) {
      if (state.filesCurrentlyUploading.length > 0) {
        const index = state.filesCurrentlyUploading.findIndex((x) => x.id === action.payload.id);

        if (state.filesCurrentlyUploading[index]) {
          state.filesCurrentlyUploading[index].progress = action.payload.progress;
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
        action.payload.folderContent.children = action.payload.folderContent.children.filter((item) => {
          return !state.pendingDeleteItems[item.id.toString()];
        });
        action.payload.folderContent.files = action.payload.folderContent.files.filter((item) => {
          return !state.pendingDeleteItems[item.fileId];
        });

        state.isLoading = false;
        state.currentFolderId = action.payload.currentFolderId;
        state.folderContent = action.payload.folderContent;
        state.selectedItems = [];
        state.filesAlreadyUploaded = state.filesAlreadyUploaded.filter((file) => file.isUploaded === false);
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

export const storageActions = storageSlice.actions;

export const storageThunks = {
  initializeThunk,
  getUsageAndLimitThunk,
  getFolderContentThunk,
  goBackThunk,
  updateFileMetadataThunk,
  updateFolderMetadataThunk,
  createFolderThunk,
  moveFileThunk,
  deleteItemsThunk,
};

export default storageSlice.reducer;
