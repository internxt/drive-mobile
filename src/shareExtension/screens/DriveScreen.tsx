import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Keyboard, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { BottomFilePanel } from '../components/BottomFilePanel';
import { DriveHeader } from '../components/DriveHeader';
import { DriveList, DriveListItem } from '../components/DriveScreen/DriveList';
import { RootHeader } from '../components/DriveScreen/RootHeader';
import { SortRow } from '../components/DriveScreen/SortRow';
import { SubfolderHeader } from '../components/DriveScreen/SubfolderHeader';
import { NewFolderModal } from '../components/NewFolderModal';
import { ShareNameCollisionModal } from '../components/ShareNameCollisionModal';
import { UploadFeedback } from '../components/UploadFeedback';
import { UploadSuccessCard } from '../components/UploadSuccessCard';
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { useNavAnimation } from '../hooks/useNavAnimation';
import { useSearchAnimation } from '../hooks/useSearchAnimation';
import {
  CollisionState,
  NameCollisionAction,
  SharedFile,
  UploadErrorType,
  UploadProgress,
  UploadStatus,
} from '../types';
import { getUploadErrorMessage } from '../utils';

interface DriveScreenProps {
  sharedFiles: SharedFile[];
  rootFolderUuid: string;
  uploadStatus: UploadStatus;
  uploadErrorType: UploadErrorType | null;
  uploadError?: unknown;
  uploadProgress?: UploadProgress | null;
  thumbnailUri?: string | null;
  collisionState?: CollisionState;
  onClose: () => void;
  onSave: (destinationFolderUuid: string, renamedFileName?: string) => void;
  onViewInFolder: (folderUuid: string) => void;
  onDismissError: () => void;
  onCollisionAction?: (action: NameCollisionAction | null) => void;
}

export const DriveScreen = ({
  sharedFiles,
  rootFolderUuid,
  uploadStatus,
  uploadErrorType,
  uploadError,
  uploadProgress,
  thumbnailUri,
  collisionState,
  onClose,
  onSave,
  onViewInFolder,
  onDismissError,
  onCollisionAction,
}: DriveScreenProps) => {
  const tailwind = useTailwind();
  const {
    currentFolder,
    folders,
    files,
    loading,
    loadingMore,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    breadcrumb,
    navigate,
    goBack,
    loadMore,
    createFolder,
  } = useFolderNavigation(rootFolderUuid);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [finalName, setFinalName] = useState(sharedFiles[0]?.fileName ?? '');

  const isRoot = breadcrumb.length === 1;
  const parentFolderIndex = breadcrumb.length - 2;
  const parentFolder = breadcrumb[parentFolderIndex];
  const isChecking = uploadStatus === 'checking';
  const isUploading = uploadStatus === 'uploading';
  const isSuccess = uploadStatus === 'success';
  const isConflict = uploadStatus === 'conflict';

  const { translateX, contentOpacity } = useNavAnimation(currentFolder.uuid, breadcrumb.length);
  const searchAnimation = useSearchAnimation();

  useEffect(() => {
    searchAnimation.resetSearch();
  }, [currentFolder.uuid, searchAnimation.resetSearch]);

  const listItems = useMemo<DriveListItem[]>(
    () => [
      ...folders.map((folder): DriveListItem => ({ type: 'folder', data: folder })),
      ...files.map((file): DriveListItem => ({ type: 'file', data: file })),
    ],
    [folders, files],
  );

  const handleSave = useCallback(() => {
    Keyboard.dismiss();
    onSave(currentFolder.uuid, finalName);
  }, [onSave, currentFolder.uuid, finalName]);

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder(name);
      setShowNewFolderModal(false);
    },
    [createFolder],
  );

  const handleViewInFolder = useCallback(
    () => onViewInFolder(currentFolder.uuid),
    [onViewInFolder, currentFolder.uuid],
  );

  const handleOpenNewFolderModal = useCallback(() => setShowNewFolderModal(true), []);
  const handleCloseNewFolderModal = useCallback(() => setShowNewFolderModal(false), []);
  const handleClearSearch = useCallback(() => setSearchQuery(''), []);
  const handleToggleViewMode = useCallback(
    () => setViewMode(viewMode === 'list' ? 'grid' : 'list'),
    [viewMode, setViewMode],
  );
  const handleStartRename = useCallback(() => setIsRenaming(true), []);
  const handleEndRename = useCallback(() => setIsRenaming(false), []);

  const showUploadingBanner = isChecking || isUploading;
  const showErrorBanner = uploadStatus === 'error';
  const ERROR_BANNER_BOTTOM = 112;

  return (
    <View
      style={[tailwind('flex-1 bg-white'), { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }]}
    >
      <DriveHeader
        onClose={onClose}
        onSave={handleSave}
        saveEnabled={!isChecking && !isUploading && !isSuccess && !isConflict}
        isSaveLoading={isChecking}
      />

      {showUploadingBanner && (
        <View style={tailwind('pt-2')}>
          <UploadFeedback
            status={uploadStatus}
            errorMessage={getUploadErrorMessage(uploadErrorType, uploadError)}
            progress={uploadProgress}
          />
        </View>
      )}

      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateX }] }}>
        {isRoot ? (
          <RootHeader
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            onNewFolder={handleOpenNewFolderModal}
          />
        ) : (
          <SubfolderHeader
            folderName={currentFolder.name}
            parentName={parentFolder?.name ?? strings.screens.ShareExtension.rootFolderName}
            onBack={goBack}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            onClearSearch={handleClearSearch}
            onNewFolder={handleOpenNewFolderModal}
            searchAnim={searchAnimation}
          />
        )}

        <SortRow viewMode={viewMode} onToggleViewMode={handleToggleViewMode} />
        <DriveList
          listData={listItems}
          viewMode={viewMode}
          loading={loading}
          loadingMore={loadingMore}
          searchQuery={searchQuery}
          onNavigate={navigate}
          onLoadMore={loadMore}
        />
      </Animated.View>

      {showErrorBanner && (
        <View style={{ position: 'absolute', bottom: ERROR_BANNER_BOTTOM, left: 0, right: 0 }}>
          <UploadFeedback
            status="error"
            errorMessage={getUploadErrorMessage(uploadErrorType, uploadError)}
            onDismissError={onDismissError}
          />
        </View>
      )}

      <BottomFilePanel
        sharedFiles={sharedFiles}
        finalName={finalName}
        isRenaming={isRenaming}
        onStartRename={handleStartRename}
        onChangeName={setFinalName}
        onEndRename={handleEndRename}
      />

      <NewFolderModal visible={showNewFolderModal} onCancel={handleCloseNewFolderModal} onCreate={handleCreateFolder} />

      <ShareNameCollisionModal
        visible={!!collisionState?.visible}
        itemNameWithoutExtension={collisionState?.itemNameWithoutExtension ?? ''}
        collisionedFilesCounter={collisionState?.collisionCount ?? 0}
        onConfirm={(action) => onCollisionAction?.(action)}
        onCancel={() => onCollisionAction?.(null)}
      />

      {isSuccess && (
        <UploadSuccessCard
          sharedFiles={sharedFiles}
          uploadedFileName={finalName}
          thumbnailUri={thumbnailUri}
          onClose={onClose}
          onViewInFolder={handleViewInFolder}
        />
      )}
    </View>
  );
};
