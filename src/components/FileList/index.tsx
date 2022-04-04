import React, { useEffect, useState } from 'react';
import { RefreshControl, View, FlatList, Dimensions } from 'react-native';
import _ from 'lodash';

import { tailwind } from '../../helpers/designSystem';
import FileItem from '../FileItem';
import SkinSkeleton from '../SkinSkeleton';
import EmptyDriveImage from '../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../assets/images/screens/empty-folder.svg';
import NoResultsImage from '../../../assets/images/screens/no-results.svg';
import EmptyList from '../EmptyList';
import strings from '../../../assets/lang/strings';
import { storageThunks } from '../../store/slices/storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import fileService from '../../services/file';
import { DriveFileData, DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { FileListType, FileListViewMode } from '../../types';

interface FileListProps {
  type: FileListType;
  viewMode: FileListViewMode;
}

function FileList(props: FileListProps): JSX.Element {
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const {
    folderContent,
    uploadingFiles,
    searchString,
    filesAlreadyUploaded,
    sortType,
    sortDirection,
    isUploadingFileName,
    isLoading: filesLoading,
    currentFolderId,
  } = useAppSelector((state) => state.storage);
  const { user } = useAppSelector((state) => state.auth);
  let folderList: DriveFolderData[] = (folderContent && folderContent.children) || [];
  let fileList: DriveFileData[] = (folderContent && folderContent.files) || [];
  const sortFunction = fileService.getSortFunction({ type: sortType, direction: sortDirection });

  if (searchString) {
    fileList = fileList.filter((file) => file.name.toLowerCase().includes(searchString.toLowerCase()));
    folderList = folderList.filter((folder) => folder.name.toLowerCase().includes(searchString.toLowerCase()));
  }

  folderList = folderList.slice().sort(sortFunction as any);
  fileList = fileList.slice().sort(sortFunction as any);

  const rootFolderId = user?.root_folder_id;
  const isRootFolder = currentFolderId === rootFolderId;

  useEffect(() => {
    if (!folderContent && rootFolderId) {
      dispatch(storageThunks.getFolderContentThunk({ folderId: rootFolderId }));
    }
  }, []);

  const isUploading = isUploadingFileName;
  const isEmptyFolder =
    folderList.length === 0 &&
    fileList.length === 0 &&
    uploadingFiles.length === 0 &&
    filesAlreadyUploaded.length === 0 &&
    !isUploading;

  const windowWidth = Dimensions.get('window').width;
  const totalColumns = Math.min(Math.max(Math.trunc(windowWidth / 125), 2), 6);
  const renderNoResults = () => (
    <EmptyList {...strings.components.FileList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  return (
    <FlatList
      key={props.viewMode}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);

            await dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));

            setRefreshing(false);
          }}
        />
      }
      numColumns={props.viewMode === FileListViewMode.Grid ? totalColumns : 1}
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
      data={[...uploadingFiles, ...folderList, ...fileList, ...filesAlreadyUploaded]}
      keyExtractor={(item) => `${props.viewMode}-${item.id}`}
      renderItem={({ item }) => {
        return (
          <FileItem
            isLoading={item.isLoading}
            isFolder={!!item.parentId}
            type={props.type}
            item={item}
            progress={isNaN(item.progress) ? -1 : item.progress}
            viewMode={props.viewMode}
            totalColumns={totalColumns}
          />
        );
      }}
      ItemSeparatorComponent={() => {
        return !props.isGrid ? <View style={{ height: 1, ...tailwind('bg-neutral-20') }}></View> : <View></View>;
      }}
    />
  );
}

export default FileList;
