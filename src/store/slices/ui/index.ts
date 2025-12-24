import { DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  searchActive: boolean;
  fileViewMode: DriveListViewMode;
  showItemModal: boolean;
  showAddItemModal: boolean;
  showMoveModal: boolean;
  showDeleteModal: boolean;
  showShareModal: boolean;
  showUploadModal: boolean;
  backButtonEnabled: boolean;
  showRenameModal: boolean;
  showRunOutOfSpaceModal: boolean;
  isLinkCopiedModalOpen: boolean;
  isSignOutModalOpen: boolean;
  isDeleteAccountModalOpen: boolean;
  isEditNameModalOpen: boolean;
  isChangeProfilePictureModalOpen: boolean;
  isLanguageModalOpen: boolean;
  isSecurityModalOpen: boolean;
  isEnableTwoFactorModalOpen: boolean;
  isDisableTwoFactorModalOpen: boolean;
  isPlansModalOpen: boolean;
  isCancelSubscriptionModalOpen: boolean;
  isSharedLinkOptionsModalOpen: boolean;
}

const initialState: UIState = {
  searchActive: false,
  fileViewMode: DriveListViewMode.List,
  showItemModal: false,
  showAddItemModal: false,
  showMoveModal: false,
  showDeleteModal: false,
  showShareModal: false,
  showUploadModal: false,
  backButtonEnabled: true,
  showRenameModal: false,
  showRunOutOfSpaceModal: false,
  isLinkCopiedModalOpen: false,
  isSignOutModalOpen: false,
  isDeleteAccountModalOpen: false,
  isEditNameModalOpen: false,
  isChangeProfilePictureModalOpen: false,
  isLanguageModalOpen: false,
  isSecurityModalOpen: false,
  isEnableTwoFactorModalOpen: false,
  isDisableTwoFactorModalOpen: false,
  isPlansModalOpen: false,
  isCancelSubscriptionModalOpen: false,
  isSharedLinkOptionsModalOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    resetState(state) {
      Object.assign(state, initialState);
    },
    setSearchActive: (state, action: PayloadAction<boolean>) => {
      state.searchActive = action.payload;
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

    setBackButtonEnabled: (state, action: PayloadAction<boolean>) => {
      state.backButtonEnabled = action.payload;
    },
    setIsLinkCopiedModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isLinkCopiedModalOpen = action.payload;
    },
    setIsSignOutModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isSignOutModalOpen = action.payload;
    },
    setIsDeleteAccountModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeleteAccountModalOpen = action.payload;
    },
    setIsEditNameModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isEditNameModalOpen = action.payload;
    },
    setIsChangeProfilePictureModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isChangeProfilePictureModalOpen = action.payload;
    },
    setIsLanguageModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isLanguageModalOpen = action.payload;
    },
    setIsSecurityModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isSecurityModalOpen = action.payload;
    },
    setIsEnableTwoFactorModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isEnableTwoFactorModalOpen = action.payload;
    },
    setIsDisableTwoFactorModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDisableTwoFactorModalOpen = action.payload;
    },
    setIsPlansModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPlansModalOpen = action.payload;
    },
    setIsCancelSubscriptionModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isCancelSubscriptionModalOpen = action.payload;
    },
    setIsSharedLinkOptionsModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isSharedLinkOptionsModalOpen = action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;
