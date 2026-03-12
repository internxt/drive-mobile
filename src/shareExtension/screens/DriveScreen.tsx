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
import { useFolderNavigation } from '../hooks/useFolderNavigation';
import { useNavAnimation } from '../hooks/useNavAnimation';
import { useSearchAnimation } from '../hooks/useSearchAnimation';
import { SharedFile } from '../types';

interface DriveScreenProps {
  sharedFiles: SharedFile[];
  rootFolderUuid: string;
  onClose: () => void;
  onSave: (destinationFolderUuid: string, finalFileName?: string) => void;
}

export const DriveScreen = ({ sharedFiles, rootFolderUuid, onClose, onSave }: DriveScreenProps) => {
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
  const [editingName, setEditingName] = useState(sharedFiles[0]?.fileName ?? '');

  const isRoot = breadcrumb.length === 1;
  const parentFolderIndex = breadcrumb.length - 2;
  const parentFolder = breadcrumb[parentFolderIndex];

  const { translateX, contentOpacity } = useNavAnimation(currentFolder.uuid, breadcrumb.length);
  const searchAnimation = useSearchAnimation();

  useEffect(() => {
    searchAnimation.resetSearch();
  }, [currentFolder.uuid]);

  const listItems = useMemo<DriveListItem[]>(
    () => [
      ...folders.map((folder): DriveListItem => ({ type: 'folder', data: folder })),
      ...files.map((file): DriveListItem => ({ type: 'file', data: file })),
    ],
    [folders, files],
  );

  const handleSave = useCallback(() => {
    Keyboard.dismiss();
    onSave(currentFolder.uuid, isRenaming ? editingName : undefined);
  }, [onSave, currentFolder.uuid, isRenaming, editingName]);

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder(name);
      setShowNewFolderModal(false);
    },
    [createFolder],
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

  return (
    <View
      style={[tailwind('flex-1 bg-white'), { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }]}
    >
      {/* saveEnabled will be blocked when files are uploading (next tasks) */}
      <DriveHeader onClose={onClose} onSave={handleSave} saveEnabled={true} />

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

      <BottomFilePanel
        sharedFiles={sharedFiles}
        editingName={editingName}
        isRenaming={isRenaming}
        onStartRename={handleStartRename}
        onChangeName={setEditingName}
        onEndRename={handleEndRename}
      />

      <NewFolderModal visible={showNewFolderModal} onCancel={handleCloseNewFolderModal} onCreate={handleCreateFolder} />
    </View>
  );
};
