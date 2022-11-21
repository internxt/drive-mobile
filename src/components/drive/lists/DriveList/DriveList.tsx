import React, { useEffect } from 'react';
import { View, useWindowDimensions, ViewStyle } from 'react-native';
import _ from 'lodash';

import { DriveListModeItem } from '../items/DriveListModeItem';
import { DriveGridModeItem } from '../items/DriveGridModeItem';
import DriveItemSkinSkeleton from '../../../DriveItemSkinSkeleton';
import EmptyDriveImage from '../../../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../../../assets/images/screens/empty-folder.svg';
import NoResultsImage from '../../../../../assets/images/screens/no-results.svg';
import EmptyList from '../../../EmptyList';
import strings from '../../../../../assets/lang/strings';
import { driveSelectors, driveThunks } from '../../../../store/slices/drive';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { DriveListType, DriveListViewMode, DriveListItem } from '../../../../types/drive';
import { useTailwind } from 'tailwind-rn';
import { VirtualizedListView } from '@internxt-mobile/ui-kit';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
interface DriveListProps {
  type?: DriveListType;
  viewMode: DriveListViewMode;
  items?: DriveListItem[];

  // Starting to refactor this component
  // so it can be reused consistently
  onDriveItemActionsPress?: (driveItem: DriveListItem) => void;
  onDriveItemPress?: (driveItem: DriveListItem) => void;
  onRefresh?: () => Promise<void>;
  renderEmpty?: () => React.ReactNode;
  contentContainerStyle?: ViewStyle;
}

export function DriveList(props: DriveListProps): JSX.Element {
  const tailwind = useTailwind();
  const { width } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { searchString, isLoading: filesLoading } = useAppSelector((state) => state.drive);
  const { id: currentFolderId } = useAppSelector(driveSelectors.navigationStackPeek);
  const { user } = useAppSelector((state) => state.auth);
  const isGrid = props.viewMode === DriveListViewMode.Grid;
  const rootFolderId = user?.root_folder_id;
  const isRootFolder = currentFolderId === rootFolderId;
  const isEmptyFolder = props.items?.length === 0;
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
    if (rootFolderId && !props.onRefresh) {
      dispatch(driveThunks.getFolderContentThunk({ folderId: rootFolderId }));
    }

    return () => {
      unsubscribeRestored && unsubscribeRestored();
      unsubscribeTrashed && unsubscribeTrashed();
    };
  }, []);

  function renderEmptyState() {
    if (filesLoading || !props.items) {
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
      if (searchString) {
        return renderNoResults();
      }

      if (props.renderEmpty) {
        return props.renderEmpty();
      }
      const image = isRootFolder ? (
        <EmptyDriveImage width={100} height={100} />
      ) : (
        <EmptyFolderImage width={100} height={100} />
      );
      return (
        <EmptyList
          {...(isRootFolder ? strings.screens.drive.emptyRoot : strings.screens.drive.emptyFolder)}
          image={image}
        />
      );
    }
  }

  async function handleOnRefresh() {
    if (props.onRefresh) {
      props.onRefresh();
    } else {
      dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId, ignoreCache: true }));
    }
  }

  function renderItem(item: DriveListItem) {
    return (
      <View style={tailwind('h-full flex justify-center')}>
        <ItemComponent
          type={props.type || DriveListType.Drive}
          data={item.data}
          status={item.status}
          progress={item.progress}
          viewMode={props.viewMode}
          onActionsPress={
            props.onDriveItemActionsPress
              ? () => {
                  props.onDriveItemActionsPress && props.onDriveItemActionsPress(item);
                }
              : undefined
          }
          onPress={
            props.onDriveItemPress
              ? () => {
                  props.onDriveItemPress && props.onDriveItemPress(item);
                }
              : undefined
          }
        />
        {isGrid ? <View></View> : <View style={{ height: 1, ...tailwind('bg-neutral-20') }}></View>}
      </View>
    );
  }

  return (
    <VirtualizedListView<DriveListItem>
      contentContainerStyle={
        props.viewMode === DriveListViewMode.Grid
          ? { ...tailwind('py-6 ml-2'), ...props.contentContainerStyle }
          : props.contentContainerStyle
      }
      onRefresh={handleOnRefresh}
      data={props.items}
      itemSize={sizeByMode[props.viewMode]}
      renderRow={renderItem}
      renderEmpty={renderEmptyState}
    />
  );
}

export default DriveList;
