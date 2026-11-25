import lodash from 'lodash';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import DriveItem from '../../../components/drive/lists/items';
import DriveItemSkinSkeleton from '../../../components/DriveItemSkinSkeleton';
import EmptyList from '../../../components/EmptyList';
import { FLOATING_BUTTON_CLEARANCE } from 'src/components/FloatingActionButton/floatingButtonLayout';
import useGetColor from '../../../hooks/useColor';

import { UseCaseStatus } from '@internxt-mobile/hooks/common';
import { RecentListFile } from '@internxt-mobile/types/drive/file';
import { DriveListType, DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import * as useCases from '@internxt-mobile/useCases/drive';
import EmptyRecentsImage from 'assets/images/screens/empty-recents.svg';
import NoResultsImage from 'assets/images/screens/no-results.svg';
import { checkIsFolder } from '../../../helpers';
import { DriveItemData, DriveItemStatus } from '../../../types/drive/item';

interface RecentsScreenProps {
  searchText?: string;
  isLoading: boolean;
  refreshRecentItems: () => void;
  recentItems: RecentListFile[] | null;
}

export function RecentsScreen({
  recentItems,
  refreshRecentItems,
  isLoading,
  searchText,
}: RecentsScreenProps): JSX.Element {
  const getColor = useGetColor();
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

  const recentsToRender = useMemo(
    () => (searchText ? useCases.filterRecentItems(recentItems, searchText) : recentItems),
    [recentItems, searchText],
  );
  const recentDriveItems = useMemo<DriveItemData[]>(
    () => (recentsToRender ?? []).map((recentItem) => ({ ...recentItem, isFolder: checkIsFolder(recentItem) })),
    [recentsToRender],
  );
  const previewFiles = useMemo(
    () => recentDriveItems.filter((recentDriveItem) => !recentDriveItem.isFolder),
    [recentDriveItems],
  );

  const renderContent = () => {
    if (!recentsToRender?.length) {
      return renderEmpty();
    }
    if (searchText && !recentsToRender.length) {
      return renderNoResults();
    }

    if (recentsToRender.length > 0) {
      return recentDriveItems.map((recentDriveItem) => {
        return (
          <DriveItem
            key={recentDriveItem.uuid}
            status={DriveItemStatus.Idle}
            type={DriveListType.Drive}
            viewMode={DriveListViewMode.List}
            data={recentDriveItem}
            previewFiles={previewFiles}
            progress={-1}
          />
        );
      });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: getColor('bg-surface') }}>
      {getStatus() === UseCaseStatus.LOADING && !recentItems && (
        <View style={{ backgroundColor: getColor('bg-surface') }}>
          {lodash.times(20, (n) => (
            <DriveItemSkinSkeleton key={n} />
          ))}
        </View>
      )}

      {(getStatus() === UseCaseStatus.SUCCESS || recentItems) && (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={getColor('text-primary')}
              colors={[getColor('text-primary')]}
              progressBackgroundColor={getColor('bg-gray-5')}
            />
          }
          contentContainerClassName="flex-grow"
          contentContainerStyle={{ backgroundColor: getColor('bg-surface'), paddingBottom: FLOATING_BUTTON_CLEARANCE }}
          style={{ backgroundColor: getColor('bg-surface') }}
        >
          {renderContent()}
        </ScrollView>
      )}
    </View>
  );
}
