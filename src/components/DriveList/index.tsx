import React, { useEffect, useState } from 'react';
import { RefreshControl, View, FlatList, Dimensions } from 'react-native';
import _ from 'lodash';

import { tailwind } from '../../helpers/designSystem';
import DriveItemTable from '../DriveItemTable';
import DriveItemGrid from '../DriveItemGrid';
import SkinSkeleton from '../SkinSkeleton';
import EmptyDriveImage from '../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../assets/images/screens/empty-folder.svg';
import NoResultsImage from '../../../assets/images/screens/no-results.svg';
import EmptyList from '../EmptyList';
import strings from '../../../assets/lang/strings';
import { driveThunks } from '../../store/slices/drive';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { DriveListType, DriveListViewMode, DriveListItem } from '../../types/drive';

interface DriveListProps {
  type: DriveListType;
  viewMode: DriveListViewMode;
  items: DriveListItem[];
}

function DriveList(props: DriveListProps): JSX.Element {
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const {
    folderContent,
    searchString,
    isLoading: filesLoading,
    currentFolderId,
  } = useAppSelector((state) => state.drive);
  const { user } = useAppSelector((state) => state.auth);
  const isGrid = props.viewMode === DriveListViewMode.Grid;
  const rootFolderId = user?.root_folder_id;
  const isRootFolder = currentFolderId === rootFolderId;
  const isEmptyFolder = props.items.length === 0;
  const windowWidth = Dimensions.get('window').width;
  const numColumns = Math.min(Math.max(Math.trunc(windowWidth / 125), 2), 6);
  const itemByViewMode = {
    [DriveListViewMode.List]: DriveItemTable,
    [DriveListViewMode.Grid]: DriveItemGrid,
  };
  const ItemComponent = itemByViewMode[props.viewMode];
  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  useEffect(() => {
    if (!folderContent && rootFolderId) {
      dispatch(driveThunks.getFolderContentThunk({ folderId: rootFolderId }));
    }
  }, []);

  return (
    <FlatList
      key={props.viewMode}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);

            await dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));

            setRefreshing(false);
          }}
        />
      }
      numColumns={props.viewMode === DriveListViewMode.Grid ? numColumns : 1}
      collapsable={true}
      contentContainerStyle={isEmptyFolder && tailwind('h-full justify-center')}
      ListEmptyComponent={
        filesLoading ? (
          <View style={tailwind('h-full')}>
            {_.times(20, (n) => (
              <SkinSkeleton key={n} />
            ))}
          </View>
        ) : isRootFolder ? (
          searchString ? (
            renderNoResults()
          ) : (
            <EmptyList {...strings.screens.drive.emptyRoot} image={<EmptyDriveImage width={100} height={100} />} />
          )
        ) : searchString ? (
          renderNoResults()
        ) : (
          <EmptyList {...strings.screens.drive.emptyFolder} image={<EmptyFolderImage width={100} height={100} />} />
        )
      }
      data={props.items}
      keyExtractor={(item) => `${props.viewMode}-${item.data.id}`}
      renderItem={({ item }) => {
        return (
          <ItemComponent
            type={props.type}
            data={item.data}
            status={item.status}
            progress={item.progress}
            viewMode={props.viewMode}
          />
        );
      }}
      ItemSeparatorComponent={() => {
        return isGrid ? <View></View> : <View style={{ height: 1, ...tailwind('bg-neutral-20') }}></View>;
      }}
    />
  );
}

export default DriveList;
