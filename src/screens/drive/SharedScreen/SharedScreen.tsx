import React, { useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import _ from 'lodash';
import DriveItem from '../../../components/drive/lists/items';
import DriveItemSkinSkeleton from '../../../components/DriveItemSkinSkeleton';
import strings from '../../../../assets/lang/strings';
import EmptyList from '../../../components/EmptyList';
import EmptySharesImage from 'assets/images/screens/empty-shares.svg';
import NoResultsImage from 'assets/images/screens/no-results.svg';
import { DriveItemStatus, DriveListType, DriveListViewMode } from '../../../types/drive';
import { useTailwind } from 'tailwind-rn';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { UseCaseStatus } from '@internxt-mobile/hooks/common';
import { SharedFiles, SharedFolders } from '@internxt/sdk/dist/drive/share/types';

interface SharedScreenProps {
  searchText?: string;
  isLoading: boolean;
  refreshSharedLinks: () => void;
  sharedLinks: (SharedFolders & SharedFiles)[] | null;
  onEndOfListReached: () => void;
}
export const SharedScreen: React.FC<SharedScreenProps> = ({
  searchText,
  isLoading,
  refreshSharedLinks,
  sharedLinks,
  onEndOfListReached,
}) => {
  const tailwind = useTailwind();

  const [refreshing, setRefreshing] = useState(false);

  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  const renderEmpty = () => (
    <EmptyList {...strings.screens.shared.empty} image={<EmptySharesImage width={100} height={100} />} />
  );

  const getStatus = () => {
    if (isLoading) {
      return UseCaseStatus.LOADING;
    }

    if (!isLoading && sharedLinks) {
      return UseCaseStatus.SUCCESS;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSharedLinks();
    setRefreshing(false);
  };

  const handleOnEndOfListReached = () => {
    if (isLoading) return;

    onEndOfListReached();
  };

  const renderContent = () => {
    if (!sharedLinks?.length) {
      return renderEmpty();
    }

    const sharedLinksToRender = searchText ? driveUseCases.filterSharedLinks(sharedLinks, searchText) : sharedLinks;

    if (searchText && !sharedLinksToRender.length) {
      return renderNoResults();
    }

    if (sharedLinksToRender.length > 0) {
      return sharedLinksToRender.map((sharedLink, i: React.Key) => {
        return (
          <DriveItem
            key={i}
            type={DriveListType.Shared}
            status={DriveItemStatus.Idle}
            viewMode={DriveListViewMode.List}
            data={{
              ...sharedLink,
              name: sharedLink?.plainName,
              type: 'folderId' in sharedLink ? sharedLink.type : undefined,
              /** SDK types are wrong, should fix */
              // token: sharedLink.token,
              shareId: sharedLink.id.toString(),
              thumbnails: [],
              currentThumbnail: null,
              code: (sharedLink as unknown as { code: string }).code,
              updatedAt: sharedLink.updatedAt,
              createdAt: sharedLink.createdAt,
              isFolder: sharedLink.type === 'folder',
            }}
            progress={-1}
            shareLink={sharedLink}
          />
        );
      });
    }
  };

  return (
    <View style={tailwind('bg-white flex-1')}>
      {getStatus() === UseCaseStatus.LOADING && !sharedLinks?.length && (
        <View>
          {_.times(20, (n) => (
            <DriveItemSkinSkeleton key={n} />
          ))}
        </View>
      )}

      {(getStatus() === UseCaseStatus.SUCCESS || sharedLinks) && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={tailwind('flex-grow')}
          onTouchEnd={handleOnEndOfListReached}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
};
