import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DriveListViewMode } from '../../../types/drive';

export interface UIState {
  searchActive: boolean;
  isReferralsBannerOpen: boolean;
  fileViewMode: DriveListViewMode;
  showItemModal: boolean;
  showAddItemModal: boolean;
  showMoveModal: boolean;
  showDeleteModal: boolean;
  showShareModal: boolean;
  showComingSoonModal: boolean;
  showUploadModal: boolean;
  backButtonEnabled: boolean;
  showRenameModal: boolean;
  showRunOutOfSpaceModal: boolean;
  isDeletePhotosModalOpen: boolean;
  isSharePhotoModalOpen: boolean;
  isLinkCopiedModalOpen: boolean;
  isPhotosPreviewInfoModalOpen: boolean;
  isNewsletterModalOpen: boolean;
  isInviteFriendsModalOpen: boolean;
  isDriveDownloadModalOpen: boolean;
  isSignOutModalOpen: boolean;
  isDeleteAccountModalOpen: boolean;
}

const initialState: UIState = {
  searchActive: false,
  isReferralsBannerOpen: false,
  fileViewMode: DriveListViewMode.List,
  showItemModal: false,
  showAddItemModal: false,
  showMoveModal: false,
  showDeleteModal: false,
  showShareModal: false,
  showComingSoonModal: false,
  showUploadModal: false,
  backButtonEnabled: true,
  showRenameModal: false,
  showRunOutOfSpaceModal: false,
  isDeletePhotosModalOpen: false,
  isSharePhotoModalOpen: false,
  isLinkCopiedModalOpen: false,
  isPhotosPreviewInfoModalOpen: false,
  isNewsletterModalOpen: false,
  isInviteFriendsModalOpen: false,
  isDriveDownloadModalOpen: false,
  isSignOutModalOpen: false,
  isDeleteAccountModalOpen: false,
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
      state.fileViewMode =
        state.fileViewMode === DriveListViewMode.List ? DriveListViewMode.Grid : DriveListViewMode.List;
    },
    setBackButtonEnabled: (state, action: PayloadAction<boolean>) => {
      state.backButtonEnabled = action.payload;
    },
    setIsDeletePhotosModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeletePhotosModalOpen = action.payload;
    },
    setIsSharePhotoModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isSharePhotoModalOpen = action.payload;
    },
    setIsLinkCopiedModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isLinkCopiedModalOpen = action.payload;
    },
    setIsPhotosPreviewInfoModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isPhotosPreviewInfoModalOpen = action.payload;
    },
    setIsNewsletterModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isNewsletterModalOpen = action.payload;
    },
    setIsInviteFriendsModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isInviteFriendsModalOpen = action.payload;
    },
    setIsReferralsBannerOpen: (state, action: PayloadAction<boolean>) => {
      state.isReferralsBannerOpen = action.payload;
    },
    setIsDriveDownloadModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDriveDownloadModalOpen = action.payload;
    },
    setIsSignOutModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isSignOutModalOpen = action.payload;
    },
    setIsDeleteAccountModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeleteAccountModalOpen = action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;
