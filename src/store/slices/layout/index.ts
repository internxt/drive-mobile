import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LayoutState {
  searchActive: boolean;
  createFolderActive: boolean;
  showSettingsModal: boolean;
  showItemModal: boolean;
  showAddItemModal: boolean;
  showSortModal: boolean;
  showMoveModal: boolean;
  showDeleteModal: boolean;
  showShareModal: boolean;
  showComingSoonModal: boolean;
  showUploadModal: boolean;
  showCreateFolderModal: boolean;
  backButtonEnabled: boolean;
  showRenameModal: boolean;
  showRunOutOfSpaceModal: boolean;
  isDeletePhotosModalOpen: boolean;
  fileViewMode: 'list' | 'grid';
}

const initialState: LayoutState = {
  searchActive: false,
  createFolderActive: false,
  showSettingsModal: false,
  showItemModal: false,
  showAddItemModal: false,
  showSortModal: false,
  showMoveModal: false,
  showDeleteModal: false,
  showShareModal: false,
  showComingSoonModal: false,
  showUploadModal: false,
  showCreateFolderModal: false,
  backButtonEnabled: true,
  showRenameModal: false,
  showRunOutOfSpaceModal: false,
  isDeletePhotosModalOpen: false,
  fileViewMode: 'list',
};

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setSearchActive: (state, action: PayloadAction<boolean>) => {
      state.searchActive = action.payload;
    },
    setShowSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.showSettingsModal = action.payload;
    },
    setShowSortModal: (state, action: PayloadAction<boolean>) => {
      state.showSortModal = action.payload;
    },
    setShowItemModal: (state, action: PayloadAction<boolean>) => {
      state.showItemModal = action.payload;
    },
    setShowRenameModal: (state, action: PayloadAction<boolean>) => {
      state.showRenameModal = action.payload;
    },
    setShowRunOutSpaceModal: (state, action: PayloadAction<boolean>) => {
      state.showRunOutOfSpaceModal = action.payload;
    },
    setShowCreateFolderModal: (state, action: PayloadAction<boolean>) => {
      state.showCreateFolderModal = action.payload;
    },
    setShowComingSoonModal: (state, action: PayloadAction<boolean>) => {
      state.showComingSoonModal = action.payload;
    },
    setShowUploadFileModal: (state, action: PayloadAction<boolean>) => {
      state.showUploadModal = action.payload;
    },
    setShowShareModal: (state, action: PayloadAction<boolean>) => {
      state.showShareModal = action.payload;
    },
    setShowDeleteModal: (state, action: PayloadAction<boolean>) => {
      state.showDeleteModal = action.payload;
    },
    setShowMoveModal: (state, action: PayloadAction<boolean>) => {
      state.showMoveModal = action.payload;
    },
    switchFileViewMode(state) {
      state.fileViewMode = state.fileViewMode === 'list' ? 'grid' : 'list';
    },
    setBackButtonEnabled: (state, action: PayloadAction<boolean>) => {
      state.backButtonEnabled = action.payload;
    },
    setIsDeletePhotosModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeletePhotosModalOpen = action.payload;
    },
  },
});

export const layoutActions = layoutSlice.actions;

export default layoutSlice.reducer;
