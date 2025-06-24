import { useDrive } from '@internxt-mobile/hooks/drive';
import drive from '@internxt-mobile/services/drive';
import errorService from '@internxt-mobile/services/ErrorService';
import { SearchResult } from '@internxt/sdk/dist/drive/storage/types';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MagnifyingGlass } from 'phosphor-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppText from 'src/components/AppText';
import DriveList from 'src/components/drive/lists/DriveList/DriveList';
import useGetColor from 'src/hooks/useColor';
import { useAppDispatch } from 'src/store/hooks';
import { driveActions, driveThunks } from 'src/store/slices/drive';
import { DriveItemStatus, DriveListItem, DriveListType } from 'src/types/drive';
import { DriveScreenProps } from 'src/types/navigation';
import { useTailwind } from 'tailwind-rn';
import { logger } from '../../../../services/common';
import storageService from '../../../../services/StorageService';

import strings from '../../../../../assets/lang/strings';
import { useGlobalSearch } from './useGlobalSearch';

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onItemPress?: (item: SearchResult) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ visible, onClose, onItemPress }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [inputRef, setInputRef] = useState<TextInput | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigation = useNavigation<DriveScreenProps<'DriveFolder'>['navigation']>();
  const driveCtx = useDrive();
  const dispatch = useAppDispatch();
  const { query, results, isLoading, isLoadingMore, error, hasMore, updateQuery, loadMore, clearSearch, hasResults } =
    useGlobalSearch();

  const driveListItems = useMemo<any[]>(() => {
    return results.map((result) => {
      const isFolder = result.itemType.toLowerCase() === 'folder';

      return {
        status: DriveItemStatus.Idle,
        id: result.id.toString(),
        data: {
          uuid: result.itemId,
          name: result.name,
          size: result.item.size ?? 0,
          createdAt: '',
          updatedAt: '',
          isFolder: isFolder,
          type: isFolder ? undefined : result.item.type,
          id: result.id,
          fileId: isFolder ? undefined : result.item.fileId,
          bucket: isFolder ? undefined : result.item.bucket,
          currentThumbnail: null,
        },
      };
    });
  }, [results]);

  useEffect(() => {
    if (visible && inputRef) {
      setTimeout(() => {
        inputRef.focus();
      }, 100);
    }
  }, [visible, inputRef]);

  useEffect(() => {
    if (!visible) {
      clearSearch();
    }
  }, [visible, clearSearch]);

  const navigateToFolder = async (folderUuid: string) => {
    try {
      setIsNavigating(true);
      const folderMeta = await storageService.getFolderMetadata(folderUuid);
      const ancestors = await storageService.getFolderAncestors(folderUuid);
      await driveCtx.loadFolderContent(folderUuid, {
        focusFolder: true,
        resetPagination: true,
      });
      onClose();
      const parentFolder = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
      navigation.push('DriveFolder', {
        folderUuid: folderUuid,
        parentUuid: parentFolder?.uuid ?? '',
        parentFolderName: parentFolder?.plainName ?? 'Drive',
        folderName: folderMeta.plainName,
        isRootFolder: false,
      });
    } catch (error) {
      errorService.reportError(error);
      logger.error('Error navigating to folder:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  const navigateToFile = async (fileUuid: string) => {
    try {
      setIsNavigating(true);
      const fileMeta = await storageService.getFileMetadata(fileUuid);
      const driveFileData = {
        status: 'idle' as const,
        id: fileMeta.id.toString(),
        data: {
          folderUuid: fileMeta.folderUuid,
          uuid: fileMeta.uuid,
          name: fileMeta.plainName,
          size: fileMeta.size,
          createdAt: fileMeta.createdAt,
          updatedAt: fileMeta.updatedAt,
          fileId: fileMeta.fileId,
          folderId: fileMeta.folderId,
          bucket: fileMeta.bucket,
          type: fileMeta.type,
          isFolder: false,
          currentThumbnail: null,
          id: fileMeta.id,
          thumbnails: fileMeta.thumbnails ?? [],
          parentId: fileMeta.folderId,
        },
      };
      dispatch(
        driveActions.setFocusedItem({
          ...driveFileData.data,
          name: driveFileData.data.name ?? '',
          id: driveFileData.data.id,
          uuid: driveFileData.data.uuid,
          folderUuid: driveFileData.data.folderUuid,
          shareId: undefined,
          parentId: driveFileData.data.folderId,
          size: driveFileData.data.size,
          updatedAt: driveFileData.data.updatedAt,
          isFolder: driveFileData.data.isFolder,
          bucket: driveFileData.data.bucket,
        }),
      );
      const thunk = dispatch(
        driveThunks.downloadFileThunk({
          ...driveFileData,
          bucketId: driveFileData.data.bucket as string,
          size: driveFileData.data.size as number,
          parentId: driveFileData.data.parentId as number,
          name: driveFileData.data.name ?? '',
          type: driveFileData.data.type as string,
          fileId: driveFileData.data.fileId as string,
          updatedAt: new Date(driveFileData.data.updatedAt).toISOString(),
          id: driveFileData.data.id,
          openFileViewer: false,
        }),
      );
      const downloadAbort = () => {
        thunk.abort();
      };
      drive.events.setDownloadAbort(downloadAbort);
      onClose();
      navigation.navigate('DrivePreview');
    } catch (error) {
      errorService.reportError(error);
      logger.error('Error navigating to file:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  const handleDriveItemPress = useCallback(
    async (driveItem: DriveListItem) => {
      if (isNavigating) return;

      if (onItemPress) {
        const searchResult = results.find((r) => r.id.toString() === driveItem.id);
        if (searchResult) {
          onItemPress(searchResult);
        }
        onClose();
        return;
      }

      const isFolder = driveItem.data.isFolder;

      if (isFolder && driveItem.data.uuid) {
        await navigateToFolder(driveItem.data.uuid);
      } else if (!isFolder && driveItem.data.uuid) {
        await navigateToFile(driveItem.data.uuid);
      }
    },
    [onItemPress, onClose, isNavigating, results],
  );

  const handleDriveItemActionsPress = useCallback((driveItem: DriveListItem) => {
    console.log('Actions for search item:', driveItem.data.name);
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={tailwind('flex-1 justify-center items-center')}>
          <ActivityIndicator size="large" color={getColor('text-primary')} />
          <AppText style={[tailwind('mt-4 text-base'), { color: getColor('text-gray-100') }]}>
            {strings.modals.GlobalSearchModal.searching}
          </AppText>
        </View>
      );
    }
    if (error) {
      return (
        <View style={tailwind('flex-1 justify-center items-center px-8')}>
          <AppText style={[tailwind('text-base text-center'), { color: getColor('text-red-100') }]}>
            {strings.modals.GlobalSearchModal.searchError}
          </AppText>
          <TouchableOpacity
            onPress={() => {
              if (query.trim()) {
                updateQuery(query);
              }
            }}
            style={tailwind('mt-4 px-4 py-2 bg-primary rounded-lg')}
          >
            <AppText style={[tailwind('text-sm'), { color: getColor('text-white') }]}>
              {strings.modals.GlobalSearchModal.tryAgainButton}
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }
    if (query.trim() && !hasResults) {
      return (
        <View style={tailwind('flex-1 justify-center items-center px-8')}>
          <MagnifyingGlass size={48} color={getColor('text-gray-40')} />
          <AppText style={[tailwind('mt-4 text-base text-center'), { color: getColor('text-gray-100') }]}>
            {strings.modals.GlobalSearchModal.noResultsTitle}
          </AppText>
          <AppText style={[tailwind('mt-2 text-sm text-center'), { color: getColor('text-gray-40') }]}>
            {strings.modals.GlobalSearchModal.noResultsMessage}
          </AppText>
        </View>
      );
    }
    return (
      <View style={tailwind('flex-1 justify-center items-center px-8')}>
        <MagnifyingGlass size={48} color={getColor('text-gray-40')} />
        <AppText style={[tailwind('mt-4 text-base text-center'), { color: getColor('text-gray-100') }]}>
          {strings.modals.GlobalSearchModal.searchPromptTitle}
        </AppText>
        <AppText style={[tailwind('mt-2 text-sm text-center'), { color: getColor('text-gray-40') }]}>
          {strings.modals.GlobalSearchModal.searchPromptMessage}
        </AppText>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[tailwind('flex-1'), { backgroundColor: getColor('bg-surface') }]}>
        <KeyboardAvoidingView style={tailwind('flex-1')} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header */}
          <View style={tailwind('flex-row items-center px-4 py-3 border-b border-gray-5')}>
            <TouchableOpacity
              onPress={onClose}
              style={tailwind('mr-3 p-2')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isNavigating}
            >
              <ArrowLeft size={24} color={getColor('text-gray-80')} />
            </TouchableOpacity>
            <View
              style={[
                tailwind('flex-1 flex-row items-center bg-gray-5 rounded-lg px-3 py-2'),
                { backgroundColor: getColor('bg-gray-5') },
              ]}
            >
              <MagnifyingGlass size={20} color={getColor('text-gray-100')} />
              <TextInput
                ref={setInputRef}
                value={query}
                onChangeText={updateQuery}
                placeholder={strings.modals.GlobalSearchModal.searchPlaceholder}
                placeholderTextColor={getColor('text-gray-40')}
                style={[tailwind('flex-1 ml-2 text-base'), { color: getColor('text-gray-100') }]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                editable={!isNavigating}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={clearSearch}
                  style={tailwind('ml-2 p-2')}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                  disabled={isNavigating}
                >
                  <AppText style={[tailwind('text-sm'), { color: getColor('text-gray-100') }]}>
                    {strings.modals.GlobalSearchModal.clear}
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Navigation loader */}
          {isNavigating && (
            <View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  zIndex: 50,
                },
                tailwind('justify-center items-center'),
              ]}
            >
              <View style={[tailwind('p-4 rounded-lg items-center'), { backgroundColor: getColor('bg-surface') }]}>
                <ActivityIndicator size="large" color={getColor('text-primary')} />
                <AppText style={[tailwind('mt-2 text-sm'), { color: getColor('text-gray-100') }]}>
                  {strings.modals.GlobalSearchModal.opening}
                </AppText>
              </View>
            </View>
          )}

          {/* Search Results */}
          {hasResults ? (
            <DriveList
              type={DriveListType.Drive}
              viewMode={driveCtx.viewMode}
              items={driveListItems as DriveListItem[]}
              onDriveItemPress={handleDriveItemPress}
              onDriveItemActionsPress={handleDriveItemActionsPress}
              onEndReached={handleEndReached}
              isLoading={isLoading}
              searchValue={query}
              renderEmpty={renderEmptyState}
              hideOptionsButton
            />
          ) : (
            renderEmptyState()
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
