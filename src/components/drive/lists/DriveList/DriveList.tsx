import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, useWindowDimensions, View, ViewStyle } from 'react-native';

import { DriveListType, DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import { useTailwind } from 'tailwind-rn';
import EmptyDriveImage from '../../../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../../../assets/images/screens/empty-folder.svg';
import NoResultsImage from '../../../../../assets/images/screens/no-results.svg';
import strings from '../../../../../assets/lang/strings';
import useGetColor from '../../../../hooks/useColor';
import { DriveListItem } from '../../../../types/drive/item';
import DriveItemSkinSkeleton from '../../../DriveItemSkinSkeleton';
import EmptyList from '../../../EmptyList';
import { SelectionModeContext } from '../items/SelectionModeContext';
import { useSelectionProgress } from '../items/useSelectionProgress';
import { DriveListRow } from './DriveListRow';

interface DriveListProps {
  type?: DriveListType;
  viewMode: DriveListViewMode;
  items?: DriveListItem[];
  // Starting to refactor this component
  // so it can be reused consistently
  onDriveItemActionsPress: (driveItem: DriveListItem) => void;
  onDriveItemPress: (driveItem: DriveListItem) => void;
  onDriveItemLongPress?: (driveItem: DriveListItem) => void;
  isSelectionMode?: boolean;
  selectedUuids?: Set<string>;
  canSelectItem?: (driveItem: DriveListItem) => boolean;
  onRefresh?: () => Promise<void>;
  renderEmpty?: () => React.ReactNode;
  contentContainerStyle?: ViewStyle;
  searchValue?: string;
  onEndReached?: () => void;
  // Feels weird that this is here
  // but we need it to render the empty image
  isRootFolder?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hideOptionsButton?: boolean;
}

export const DriveList = (props: DriveListProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  const listItems = useMemo(() => props.items, [props.items]);
  const selectionModeProgress = useSelectionProgress(!!props.isSelectionMode);

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

  const handleOnScrollEnd = () => {
    props.onEndReached && props.onEndReached();
  };

  const renderEmptyState = () => {
    if (props.isLoading || !props.items) {
      return (
        <View style={[tailwind('h-full w-full'), { backgroundColor: getColor('bg-surface') }]}>
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
  };

  const renderLoadingMore = () => {
    if (!props.isLoadingMore) {
      return null;
    }

    return (
      <View style={tailwind('items-center py-4')}>
        <ActivityIndicator color={getColor('text-primary')} />
      </View>
    );
  };

  const handleOnRefresh = async () => {
    setRefreshing(true);
    props.onRefresh && (await props.onRefresh());
    setRefreshing(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: DriveListItem }) => (
      <DriveListRow
        item={item}
        type={props.type || DriveListType.Drive}
        viewMode={props.viewMode}
        selectable={props.isSelectionMode !== undefined && (props.canSelectItem?.(item) ?? true)}
        isSelected={!!props.isSelectionMode && !!props.selectedUuids?.has(item.data.uuid)}
        hideOptionsButton={props.hideOptionsButton}
        onActionsPress={props.onDriveItemActionsPress}
        onPress={props.onDriveItemPress}
        onLongPress={props.onDriveItemLongPress}
      />
    ),
    [
      props.type,
      props.viewMode,
      props.isSelectionMode,
      props.canSelectItem,
      props.selectedUuids,
      props.hideOptionsButton,
      props.onDriveItemActionsPress,
      props.onDriveItemPress,
      props.onDriveItemLongPress,
    ],
  );

  return (
    <SelectionModeContext.Provider value={selectionModeProgress}>
      <FlatList
        keyExtractor={(item) => item.data.uuid}
        style={{ backgroundColor: getColor('bg-surface') }}
        getItemLayout={(_, index) => {
          return {
            length: sizeByMode[props.viewMode].height,
            offset: sizeByMode[props.viewMode].height * index,
            index,
          };
        }}
        refreshing={refreshing}
        onRefresh={handleOnRefresh}
        ListEmptyComponent={
          <View style={[tailwind('h-full'), { backgroundColor: getColor('bg-surface') }]}>
            {renderEmptyState() as React.ReactElement}
          </View>
        }
        ListFooterComponent={renderLoadingMore()}
        key={props.viewMode}
        numColumns={props.viewMode === DriveListViewMode.List ? 1 : 3}
        renderItem={renderItem}
        contentContainerStyle={{
          ...{ flex: props.items?.length ? 0 : 1 },
          ...(props.viewMode === DriveListViewMode.Grid
            ? {
                ...tailwind('py-6 ml-2'),
                ...props.contentContainerStyle,
                backgroundColor: getColor('bg-surface'),
              }
            : {
                ...props.contentContainerStyle,
                backgroundColor: getColor('bg-surface'),
              }),
        }}
        onEndReachedThreshold={1}
        onEndReached={handleOnScrollEnd}
        data={listItems}
        extraData={props.selectedUuids}
      />
    </SelectionModeContext.Provider>
  );
};

export default DriveList;
