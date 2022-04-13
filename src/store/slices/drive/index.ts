import { createSlice, createAsyncThunk, PayloadAction, SerializedError } from '@reduxjs/toolkit';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import Share from 'react-native-share';

import { constants } from '../../../services/app';
import { LegacyDownloadRequiredError } from '../../../services/network/download';
import analytics, { AnalyticsEventKey } from '../../../services/analytics';
import fileService from '../../../services/file';
import folderService from '../../../services/folder';
import { downloadFile } from '../../../services/network';
import { downloadFile as legacyDownloadFile } from '../../../services/download';
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
} from '../../../types/drive';
import {
  createEmptyFile,
  exists,
  FileManager,
  getDocumentsDir,
  pathToUri,
  showFileViewer,
} from '../../../services/fileSystem';
import { items } from '@internxt/lib';

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
  children: DriveFolderData[];
  files: DriveFileData[];
}

export interface DriveState {
  isLoading: boolean;
  absolutePath: string;
  items: DriveItemData[];
  uploadingFiles: UploadingFile[];
  downloadingFile?: DownloadingFile;
  selectedItems: DriveItemData[];
  currentFolderId: number;
  folderContent: FolderContent | null;
  rootFolderContent: any;
  focusedItem: any | null;
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

const initialState: DriveState = {
  isLoading: false,
  items: [],
  currentFolderId: -1,
  absolutePath: '/',
  uploadingFiles: [],
  downloadingFile: undefined,
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
  'drive/initialize',
  async (payload, { dispatch }) => {
    const user = await asyncStorage.getUser();

    if (user) {
      await dispatch(getUsageAndLimitThunk());
    }
  },
);

const getFolderContentThunk = createAsyncThunk<
  { currentFolderId: number; folderContent: FolderContent },
  { folderId: number; quick?: boolean },
  { state: RootState }
>('drive/getFolderContent', async ({ folderId }) => {
  const folderContent = await fileService.getFolderContent(folderId);

  return { currentFolderId: folderId, folderContent };
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

const downloadFileThunk = createAsyncThunk<
  void,
  { id: number; size: number; parentId: number; name: string; type: string; fileId: string; updatedAt: string },
  { state: RootState }
>('drive/downloadFile', async ({ id, size, parentId, name, type, fileId }, { getState, dispatch }) => {
  const { user } = getState().auth;
  const downloadProgressCallback = (progress: number) => {
    dispatch(
      driveActions.updateDownloadingFile({
        downloadProgress: progress,
      }),
    );
  };
  const decryptionProgressCallback = (progress: number) => {
    dispatch(
      driveActions.updateDownloadingFile({
        decryptProgress: Math.max(getState().drive.downloadingFile?.downloadProgress || 0, progress),
      }),
    );
  };
  async function download(params: { fileId: string; to: string }) {
    if (!user) {
      return;
    }

    return downloadFile(
      user?.bucket,
      params.fileId,
      {
        encryptionKey: user.mnemonic,
        user: user.bridgeUser,
        password: user.userId,
      },
      constants.REACT_NATIVE_BRIDGE_URL,
      {
        toPath: params.to,
        downloadProgressCallback,
        decryptionProgressCallback,
      },
    ).catch((err) => {
      if (err instanceof LegacyDownloadRequiredError) {
        const fileManager = new FileManager(params.to);

        return legacyDownloadFile(params.fileId, {
          fileManager,
          progressCallback: downloadProgressCallback,
        });
      } else {
        throw err;
      }
    });
  }
  function trackDownloadStart() {
    return analytics.track(AnalyticsEventKey.FileDownloadStart, {
      file_id: id,
      file_size: size || 0,
      file_type: type || '',
      folder_id: parentId || null,
      platform: DevicePlatform.Mobile,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }
  function trackDownloadSuccess() {
    return analytics.track(AnalyticsEventKey.FileDownloadFinished, {
      file_id: id,
      file_size: size || 0,
      file_type: type || '',
      folder_id: parentId || null,
      platform: DevicePlatform.Mobile,
      email: user?.email || null,
      userId: user?.uuid || null,
    });
  }

  dispatch(uiActions.setIsDriveDownloadModalOpen(true));
  const destinationDir = await getDocumentsDir();
  let destinationPath = destinationDir + '/' + name + (type ? '.' + type : '');

  trackDownloadStart();
  downloadProgressCallback(0);
  const fileAlreadyExists = await exists(destinationPath);

  if (fileAlreadyExists) {
    destinationPath = destinationDir + '/' + name + '-' + Date.now().toString() + (type ? '.' + type : '');
  }

  await createEmptyFile(destinationPath);
  await download({
    fileId,
    to: destinationPath,
  })
    .then(async () => {
      const uri = pathToUri(destinationPath);

      dispatch(uiActions.setIsDriveDownloadModalOpen(false));

      try {
        const result = await Share.open({ title: items.getItemDisplayName({ name, type }), url: uri });

        if (result.success) {
          trackDownloadSuccess();
        } else if (result.dismissedAction) {
          // dismissed
        }
      } catch (err) {
        // * Ignores native share cancelation
      }
    })
    .finally(() => {
      dispatch(driveActions.downloadSelectedFileStop());
      downloadProgressCallback(0);
      decryptionProgressCallback(0);
    });
});

const updateFileMetadataThunk = createAsyncThunk<
  void,
  { file: DriveFileData; metadata: DriveFileMetadataPayload },
  { state: RootState }
>('drive/updateFileMetadata', async ({ file, metadata }, { getState }) => {
  const { bucketId } = await getEnvironmentConfig();
  const { absolutePath, focusedItem } = getState().drive;
  const itemFullName = `${metadata.itemName}${focusedItem.type ? '.' + focusedItem.type : ''}`;
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
  const itemFullName = `${metadata.itemName}${focusedItem.type ? '.' + focusedItem.type : ''}`;
  const itemPath = `${absolutePath}${itemFullName}`;

  folderService.updateMetaData(folder.id, metadata, bucketId, itemPath);
});

const createFolderThunk = createAsyncThunk<
  void,
  { parentFolderId: number; newFolderName: string },
  { state: RootState }
>('drive/createFolder', async ({ parentFolderId, newFolderName }, { dispatch }) => {
  await fileService.createFolder(parentFolderId, newFolderName);
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
          downloadProgress: 0,
          decryptProgress: 0,
        };
      })
      .addCase(downloadFileThunk.fulfilled, (state) => {
        state.downloadingFile = undefined;
      })
      .addCase(downloadFileThunk.rejected, (state, action) => {
        const { id, size, type, parentId } = action.meta.arg;
        const trackDownloadError = async (err: SerializedError) => {
          const { email, uuid } = await asyncStorage.getUser();

          return analytics.track(AnalyticsEventKey.FileDownloadError, {
            file_id: id,
            file_size: size || 0,
            file_type: type || '',
            folder_id: parentId || null,
            platform: DevicePlatform.Mobile,
            error: err.message || strings.errors.unknown,
            email: email || null,
            userId: uuid || null,
          });
        };

        state.downloadingFile = undefined;

        if (!action.meta.aborted) {
          trackDownloadError(action.error);
          notificationsService.show({ type: NotificationType.Error, text1: 'Error downloading file' });
        }
      });

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
    let folderList: DriveFolderData[] = (folderContent && folderContent.children) || [];
    let fileList: DriveFileData[] = (folderContent && folderContent.files) || [];

    if (searchString) {
      fileList = fileList.filter((file) => file.name.toLowerCase().includes(searchString.toLowerCase()));
      folderList = folderList.filter((folder) => folder.name.toLowerCase().includes(searchString.toLowerCase()));
    }

    folderList = folderList.slice().sort(sortFunction as any);
    fileList = fileList.slice().sort(sortFunction as any);

    return [
      ...uploadingFiles.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Uploading,
        progress: f.progress,
        data: {
          ...f,
        },
      })),
      ...folderList.map<DriveListItem>((f) => ({
        status: DriveItemStatus.Idle,
        data: f,
      })),
      ...fileList.map<DriveListItem>((f) => ({
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
  downloadFileThunk,
  updateFileMetadataThunk,
  updateFolderMetadataThunk,
  createFolderThunk,
  moveFileThunk,
  deleteItemsThunk,
};

export default driveSlice.reducer;
