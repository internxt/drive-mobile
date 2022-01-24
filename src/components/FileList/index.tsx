import React, { useEffect, useState } from 'react';
import { RefreshControl, View, FlatList, Dimensions } from 'react-native';
import _ from 'lodash';

import { tailwind } from '../../helpers/designSystem';
import FileItem from '../FileItem';
import SkinSkeleton from '../SkinSkeleton';
import EmptyDriveImage from '../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../assets/images/screens/empty-folder.svg';
import EmptyList from '../EmptyList';
import strings from '../../../assets/lang/strings';
import { filesThunks } from '../../store/slices/files';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import fileService from '../../services/file';

export interface IFolder {
  name: string;
  id: number;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  type: string;
  fileId: string;
  progress: number;
  folderId?: number;
  parentId: undefined;
  uri?: string;
  isUploaded?: boolean;
  isLoading?: boolean;
}

export interface IUploadingFile {
  currentFolder: number;
  progress: number;
  uri: string;
  id: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  size: number;
  name: string;
  folderId: number;
  fileId?: number;
  isUploaded?: boolean;
  isLoading?: boolean;
  parentId: number;
}

export interface IFile {
  bucket: string;
  createdAt: Date;
  folderId: number;
  fileId: string;
  id: number;
  name: string;
  type: string;
  updatedAt: Date;
  size: number;
  progress: number;
  uri?: string;
  isUploaded?: boolean;
  isLoading?: boolean;
  parentId: string;
}

interface FileListProps {
  isGrid: boolean;
}

function FileList(props: FileListProps): JSX.Element {
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const {
    folderContent,
    filesCurrentlyUploading,
    searchString,
    filesAlreadyUploaded,
    sortType,
    isUploadingFileName,
    loading: filesLoading,
  } = useAppSelector((state) => state.files);
  const { user } = useAppSelector((state) => state.auth);
  const [folderId, setFolderId] = useState<number>();
  let folderList: IFolder[] = (folderContent && folderContent.children) || [];
  let fileList: IFile[] = (folderContent && folderContent.files) || [];
  const sortFunction = fileService.getSortFunction(sortType);

  useEffect(() => {
    setRefreshing(false);

    if (folderContent && folderContent.currentFolder) {
      setFolderId(folderContent.currentFolder);
    }
  }, [folderContent]);

  if (searchString) {
    fileList = fileList.filter((file: IFile) => file.name.toLowerCase().includes(searchString.toLowerCase()));
    folderList = folderList.filter((folder: IFolder) => folder.name.toLowerCase().includes(searchString.toLowerCase()));
  }

  folderList = folderList.slice().sort(sortFunction);
  fileList = fileList.slice().sort(sortFunction);

  const rootFolderId = user?.root_folder_id;
  const currentFolderId = folderContent && folderContent.currentFolder;
  const isRootFolder = currentFolderId === rootFolderId;

  useEffect(() => {
    if (!folderContent && rootFolderId) {
      dispatch(filesThunks.getFolderContentThunk({ folderId: rootFolderId }));
    }
  }, []);

  const isUploading = isUploadingFileName;
  const isEmptyFolder =
    folderList.length === 0 &&
    fileList.length === 0 &&
    filesCurrentlyUploading.length === 0 &&
    filesAlreadyUploaded.length === 0 &&
    !isUploading;

  const windowWidth = Dimensions.get('window').width;
  const totalColumns = Math.min(Math.max(Math.trunc(windowWidth / 125), 2), 6);

  return (
    <FlatList
      key={props.isGrid ? 'grid' : 'list'}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            if (!folderContent) {
              return setRefreshing(false);
            }

            if (currentFolderId) {
              dispatch(filesThunks.getFolderContentThunk({ folderId: currentFolderId }));
            }
          }}
        />
      }
      numColumns={props.isGrid ? totalColumns : 1}
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
          <EmptyList {...strings.screens.drive.emptyRoot} image={<EmptyDriveImage width={100} height={100} />} />
        ) : (
          <EmptyList {...strings.screens.drive.emptyFolder} image={<EmptyFolderImage width={100} height={100} />} />
        )
      }
      data={[...filesCurrentlyUploading, ...folderList, ...fileList, ...filesAlreadyUploaded]}
      keyExtractor={(item) => `${props.isGrid}-${item.id}`}
      renderItem={({ item }) => {
        return (
          <FileItem
            isLoading={item.isLoading}
            isFolder={!!item.parentId}
            key={`${props.isGrid}-${item.id}`}
            item={item}
            progress={isNaN(item.progress) ? -1 : item.progress}
            isGrid={props.isGrid}
            totalColumns={totalColumns}
          />
        );
      }}
    />
  );
}

export default FileList;
