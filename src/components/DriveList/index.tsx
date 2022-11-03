import React, { useEffect, useState } from 'react';
import { RefreshControl, View, FlatList, useWindowDimensions } from 'react-native';
import _ from 'lodash';

import DriveItemTable from '../DriveItemTable';
import DriveItemGrid from '../DriveItemGrid';
import DriveItemSkinSkeleton from '../DriveItemSkinSkeleton';
import EmptyDriveImage from '../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../assets/images/screens/empty-folder.svg';
import NoResultsImage from '../../../assets/images/screens/no-results.svg';
import EmptyList from '../EmptyList';
import strings from '../../../assets/lang/strings';
import { driveSelectors, driveThunks } from '../../store/slices/drive';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { DriveListType, DriveListViewMode, DriveListItem } from '../../types/drive';
import { useTailwind } from 'tailwind-rn';
import { VirtualizedListView } from '@internxt-mobile/ui-kit';

interface DriveListProps {
  type: DriveListType;
  viewMode: DriveListViewMode;
  items: DriveListItem[];
}

function DriveList(props: DriveListProps): JSX.Element {
  const tailwind = useTailwind();
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { searchString, isLoading: filesLoading } = useAppSelector((state) => state.drive);
  const { id: currentFolderId } = useAppSelector(driveSelectors.navigationStackPeek);
  const { user } = useAppSelector((state) => state.auth);
  const isGrid = props.viewMode === DriveListViewMode.Grid;
  const rootFolderId = user?.root_folder_id;
  const isRootFolder = currentFolderId === rootFolderId;
  const isEmptyFolder = props.items.length === 0;
  const sizeByMode = {
    [DriveListViewMode.List]: {
      width,
      height: tailwind('h-16').height as number,
    },
    [DriveListViewMode.Grid]: {
      width: (width - 16) / 3,
      height: tailwind('h-48').height as number,
    },
  };
  const itemByViewMode = {
    [DriveListViewMode.List]: DriveItemTable,
    [DriveListViewMode.Grid]: DriveItemGrid,
  };
  const ItemComponent = itemByViewMode[props.viewMode];
  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  useEffect(() => {
    if (rootFolderId) {
      dispatch(driveThunks.getFolderContentThunk({ folderId: rootFolderId }));
    }
  }, []);

  function renderEmptyState() {
    if (filesLoading) {
      return (
        <View style={tailwind('h-full')}>
          {_.times(20, (n) => (
            <View style={tailwind('h-16')} key={n}>
              <DriveItemSkinSkeleton viewMode={props.viewMode} />
            </View>
          ))}
        </View>
      );
    }

    if (isEmptyFolder) {
      if (searchString) {
        return renderNoResults();
      }
      const image = isRootFolder ? (
        <EmptyDriveImage width={100} height={100} />
      ) : (
        <EmptyFolderImage width={100} height={100} />
      );
      return <EmptyList {...strings.screens.drive.emptyRoot} image={image} />;
    }
  }

  async function handleOnRefresh() {
    await dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
  }

  function renderItem(item: DriveListItem) {
    return (
      <View style={tailwind('h-full flex justify-center')}>
        <ItemComponent
          type={props.type}
          data={item.data}
          status={item.status}
          progress={item.progress}
          viewMode={props.viewMode}
        />
        {isGrid ? <View></View> : <View style={{ height: 1, ...tailwind('bg-neutral-20') }}></View>}
      </View>
    );
  }

  return (
    <VirtualizedListView<DriveListItem>
      contentContainerStyle={props.viewMode === DriveListViewMode.Grid ? tailwind('py-6 ml-2') : undefined}
      onRefresh={handleOnRefresh}
      data={props.items}
      itemSize={sizeByMode[props.viewMode]}
      renderRow={renderItem}
      renderEmpty={renderEmptyState}
    />
  );
}

export default DriveList;
