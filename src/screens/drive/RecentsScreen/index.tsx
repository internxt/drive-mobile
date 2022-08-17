import React, { useState } from 'react';
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
import { ThunkOperationStatus } from 'src/store/slices/drive';
import { useUseCase } from '@internxt-mobile/hooks/common';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import * as useCases from './useCases';
interface RecentsScreenProps {
  searchText?: string;
}

function RecentsScreen(props: RecentsScreenProps): JSX.Element {
  const tailwind = useTailwind();
  const [recents, isLoading, , refreshRecents] = useUseCase<DriveFileData[]>(() => useCases.loadRecents());
  const [refreshing, setRefreshing] = useState(false);

  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  const renderEmpty = () => (
    <EmptyList {...strings.screens.recents.empty} image={<EmptyRecentsImage width={100} height={100} />} />
  );

  const getStatus = () => {
    if (isLoading) {
      return ThunkOperationStatus.LOADING;
    }

    if (!isLoading && recents) {
      return ThunkOperationStatus.SUCCESS;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshRecents();
    setRefreshing(false);
  };

  const getRecents = () => {
    if (!recents) {
      return renderEmpty();
    }

    const recentsToRender = props.searchText ? useCases.filterRecents(recents, props.searchText) : recents;

    if (props.searchText && !recentsToRender.length) {
      return renderNoResults();
    }

    if (recentsToRender.length > 0) {
      return recents.map((item) => {
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
      {getStatus() === ThunkOperationStatus.LOADING && (
        <View>
          {lodash.times(20, (n) => (
            <DriveItemSkinSkeleton key={n} />
          ))}
        </View>
      )}

      {getStatus() === ThunkOperationStatus.SUCCESS && (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={tailwind('flex-grow')}
        >
          {getRecents()}
        </ScrollView>
      )}
    </View>
  );
}

export default RecentsScreen;
