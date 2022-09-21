import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import lodash from 'lodash';

import DriveItem from '../../../components/DriveItemTable';
import DriveItemSkinSkeleton from '../../../components/DriveItemSkinSkeleton';
import strings from '../../../../assets/lang/strings';
import EmptyList from '../../../components/EmptyList';

import { DriveItemStatus, DriveListType, DriveListViewMode } from '../../../types/drive';
import NoResultsImage from 'assets/images/screens/no-results.svg';
import EmptyRecentsImage from 'assets/images/screens/empty-recents.svg';
import { useTailwind } from 'tailwind-rn';
import { UseCaseStatus } from '@internxt-mobile/hooks/common';
import * as useCases from '@internxt-mobile/useCases/drive';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
interface RecentsScreenProps {
  searchText?: string;
  isLoading: boolean;
  refreshRecentItems: () => Promise<void>;
  recentItems: DriveFileData[] | null;
}

export function RecentsScreen({
  recentItems,
  refreshRecentItems,
  isLoading,
  searchText,
}: RecentsScreenProps): JSX.Element {
  const tailwind = useTailwind();
  const [refreshing, setRefreshing] = useState(false);

  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  const renderEmpty = () => (
    <EmptyList {...strings.screens.recents.empty} image={<EmptyRecentsImage width={100} height={100} />} />
  );

  const getStatus = () => {
    if (isLoading) {
      return UseCaseStatus.LOADING;
    }

    if (!isLoading && recentItems) {
      return UseCaseStatus.SUCCESS;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRecentItems();
    setRefreshing(false);
  };

  const renderContent = () => {
    const recentsToRender = searchText ? useCases.filterRecentItems(recentItems, searchText) : recentItems;

    if (!recentsToRender?.length) {
      return renderEmpty();
    }
    if (searchText && !recentsToRender.length) {
      return renderNoResults();
    }

    if (recentsToRender.length > 0) {
      return recentsToRender.map((item) => {
        return (
          <DriveItem
            key={item.id}
            status={DriveItemStatus.Idle}
            type={DriveListType.Drive}
            viewMode={DriveListViewMode.List}
            data={item}
            progress={-1}
          />
        );
      });
    }
  };

  return (
    <View style={tailwind('flex-1')}>
      {getStatus() === UseCaseStatus.LOADING && !recentItems && (
        <View>
          {lodash.times(20, (n) => (
            <DriveItemSkinSkeleton key={n} />
          ))}
        </View>
      )}

      {(getStatus() === UseCaseStatus.SUCCESS || recentItems) && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={tailwind('flex-grow')}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
}
