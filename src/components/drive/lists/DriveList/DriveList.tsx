import React, { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions, ViewStyle, FlatList } from 'react-native';
import _ from 'lodash';

import { DriveListModeItem } from '../items/DriveListModeItem';
import { DriveGridModeItem } from '../items/DriveGridModeItem';
import DriveItemSkinSkeleton from '../../../DriveItemSkinSkeleton';
import EmptyDriveImage from '../../../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../../../assets/images/screens/empty-folder.svg';
import NoResultsImage from '../../../../../assets/images/screens/no-results.svg';
import EmptyList from '../../../EmptyList';
import strings from '../../../../../assets/lang/strings';
import { DriveListType, DriveListViewMode, DriveListItem } from '../../../../types/drive';
import { useTailwind } from 'tailwind-rn';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
interface DriveListProps {
  type?: DriveListType;
  viewMode: DriveListViewMode;
  items?: DriveListItem[];

  // Starting to refactor this component
  // so it can be reused consistently
  onDriveItemActionsPress: (driveItem: DriveListItem) => void;
  onDriveItemPress: (driveItem: DriveListItem) => void;
  onRefresh?: () => Promise<void>;
  renderEmpty?: () => React.ReactNode;
  contentContainerStyle?: ViewStyle;
  searchValue?: string;
  onEndReached?: () => void;
  // Feels weird that this is here
  // but we need it to render the empty image
  isRootFolder?: boolean;
  isLoading?: boolean;
}

export function DriveList(props: DriveListProps): JSX.Element {
  const tailwind = useTailwind();
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const isGrid = props.viewMode === DriveListViewMode.Grid;

  const listItems = useMemo(() => props.items, [props.items]);

  const isEmptyFolder = !props.isLoading && Array.isArray(props.items) && props.items.length === 0;
  const sizeByMode = {
    [DriveListViewMode.List]: {
      width,
      height: tailwind('h-16').height as number,
    },
    [DriveListViewMode.Grid]: {
      // Remove 8px from each side of the list
      // in the grid view
      width: (width - 16) / 3,
      height: tailwind('h-48').height as number,
    },
  };
  const itemByViewMode = {
    [DriveListViewMode.List]: DriveListModeItem,
    [DriveListViewMode.Grid]: DriveGridModeItem,
  };
  const ItemComponent = itemByViewMode[props.viewMode];
  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  useEffect(() => {
    let unsubscribeTrashed: null | (() => void) = null;
    let unsubscribeRestored: null | (() => void) = null;

    if (!props.onRefresh) {
      unsubscribeTrashed = driveUseCases.onDriveItemTrashed(handleOnRefresh);
      unsubscribeRestored = driveUseCases.onDriveItemRestored(handleOnRefresh);
    }

    return () => {
      unsubscribeRestored && unsubscribeRestored();
      unsubscribeTrashed && unsubscribeTrashed();
    };
  }, []);

  function handleOnScrollEnd() {
    props.onEndReached && props.onEndReached();
  }

  function renderEmptyState() {
    if (props.isLoading || !props.items) {
      return (
        <View style={tailwind('h-full w-full')}>
          {_.times(20, (n) => (
            <View style={tailwind(`${props.viewMode === DriveListViewMode.Grid ? 'h-auto' : 'h-16'} `)} key={n}>
              <DriveItemSkinSkeleton viewMode={props.viewMode} />
            </View>
          ))}
        </View>
      );
    }

    if (isEmptyFolder) {
      if (props.searchValue) {
        return renderNoResults();
      }

      if (props.renderEmpty) {
        return props.renderEmpty();
      }
      const image = props.isRootFolder ? (
        <EmptyDriveImage width={100} height={100} />
      ) : (
        <EmptyFolderImage width={100} height={100} />
      );
      return (
        <EmptyList
          {...(props.isRootFolder ? strings.screens.drive.emptyRoot : strings.screens.drive.emptyFolder)}
          image={image}
        />
      );
    }
  }

  async function handleOnRefresh() {
    setRefreshing(true);
    props.onRefresh && (await props.onRefresh());
    setRefreshing(false);
  }

  function renderItem({ item }: { item: DriveListItem }) {
    return (
      <View
        style={[tailwind('flex justify-center'), { width: props.viewMode === DriveListViewMode.List ? '100%' : '33%' }]}
      >
        <ItemComponent
          type={props.type || DriveListType.Drive}
          data={item.data}
          status={item.status}
          progress={item.progress}
          viewMode={props.viewMode}
          onActionsPress={() => props.onDriveItemActionsPress(item)}
          onPress={
            props.onDriveItemPress
              ? () => {
                  props.onDriveItemPress && props.onDriveItemPress(item);
                }
              : undefined
          }
        />
        {isGrid ? <View></View> : <View style={{ height: 1, ...tailwind('bg-gray-1 mx-4') }}></View>}
      </View>
    );
  }

  return (
    <FlatList
      getItemLayout={(_, index) => {
        return { length: sizeByMode[props.viewMode].height, offset: sizeByMode[props.viewMode].height * index, index };
      }}
      refreshing={refreshing}
      onRefresh={handleOnRefresh}
      ListEmptyComponent={<View style={tailwind('h-full')}>{renderEmptyState() as React.ReactElement}</View>}
      key={props.viewMode}
      numColumns={props.viewMode === DriveListViewMode.List ? 1 : 3}
      renderItem={renderItem}
      contentContainerStyle={{
        ...{ flex: props.items?.length ? 0 : 1 },
        ...(props.viewMode === DriveListViewMode.Grid
          ? { ...tailwind('py-6 ml-2'), ...props.contentContainerStyle }
          : props.contentContainerStyle),
      }}
      onEndReachedThreshold={0.5}
      onEndReached={handleOnScrollEnd}
      data={listItems}
    />
  );
}

export default DriveList;
