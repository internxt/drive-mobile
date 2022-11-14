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
import { SharedLinkResult } from '@internxt-mobile/useCases/drive';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';

interface SharedScreenProps {
  searchText?: string;
  isLoading: boolean;
  refreshSharedLinks: () => void;
  sharedLinks: SharedLinkResult[] | null;
}
export const SharedScreen: React.FC<SharedScreenProps> = ({
  searchText,
  isLoading,
  refreshSharedLinks,
  sharedLinks,
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

  const renderContent = () => {
    if (!sharedLinks?.length) {
      return renderEmpty();
    }

    const sharedLinksToRender = searchText ? driveUseCases.filterSharedLinks(sharedLinks, searchText) : sharedLinks;

    if (searchText && !sharedLinksToRender.length) {
      return renderNoResults();
    }

    if (sharedLinksToRender.length > 0) {
      return sharedLinksToRender.map((sharedLink, i) => {
        return (
          <DriveItem
            key={i}
            type={DriveListType.Shared}
            status={DriveItemStatus.Idle}
            viewMode={DriveListViewMode.List}
            data={{
              ...sharedLink.item,
              type: 'folderId' in sharedLink.item ? sharedLink.item.type : undefined,
              /** SDK types are wrong, should fix */
              token: sharedLink.token,
              shareId: sharedLink.id,
              thumbnails: [],
              currentThumbnail: null,
              code: (sharedLink as unknown as { code: string }).code,
              updatedAt: sharedLink.item.updatedAt,
              createdAt: sharedLink.item.createdAt,
            }}
            progress={-1}
            shareLink={sharedLink as ShareLink}
          />
        );
      });
    }
  };
  return (
    <View style={tailwind('bg-white flex-1')}>
      {getStatus() === UseCaseStatus.LOADING && !sharedLinks && (
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
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
};
