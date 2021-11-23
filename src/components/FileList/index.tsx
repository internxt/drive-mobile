import React, { useEffect, useState } from 'react';
import { RefreshControl, View, FlatList, Dimensions } from 'react-native';
import { connect } from 'react-redux';
import _ from 'lodash';
import { tailwind } from '../../helpers/designSystem';
import { fileActions } from '../../store/actions';
import { Reducers } from '../../store/reducers/reducers';
import FileItem from '../FileItem';
import SkinSkeleton from '../SkinSkeleton';
import EmptyDriveImage from '../../../assets/images/screens/empty-drive.svg';
import EmptyFolderImage from '../../../assets/images/screens/empty-folder.svg';
import EmptyList from '../EmptyList';
import strings from '../../../assets/lang/strings';

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
  uri?: string;
  isUploaded?: boolean;
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
}

interface FileListProps extends Reducers {
  isGrid: boolean;
}

function FileList(props: FileListProps) {
  const [refreshing, setRefreshing] = useState(false);

  const { filesState } = props;
  const { folderContent } = filesState;
  let folderList: IFolder[] = (folderContent && folderContent.children) || [];
  let fileList: IFile[] = (folderContent && folderContent.files) || [];
  const [filesUploading, setFilesUploading] = useState([]);
  const [filesUploaded, setFilesUploaded] = useState([]);
  const [folderId, setFolderId] = useState<number>();

  useEffect(() => {
    setRefreshing(false);

    if (props.filesState.folderContent && props.filesState.folderContent.currentFolder) {
      setFolderId(props.filesState.folderContent.currentFolder);
    }
  }, [props.filesState.folderContent]);

  useEffect(() => {
    setFilesUploading(props.filesState.filesCurrentlyUploading);
  }, [props.filesState.filesCurrentlyUploading]);

  useEffect(() => {
    setFilesUploaded(props.filesState.filesAlreadyUploaded);
  }, [props.filesState.filesAlreadyUploaded]);

  const searchString = props.filesState.searchString;

  if (searchString) {
    fileList = fileList.filter((file: IFile) => file.name.toLowerCase().includes(searchString.toLowerCase()));
    folderList = folderList.filter((folder: IFolder) => folder.name.toLowerCase().includes(searchString.toLowerCase()));
  }

  const sortFunction = props.filesState.sortFunction;

  if (sortFunction) {
    folderList.sort(sortFunction);
    fileList.sort(sortFunction);
  }

  const rootFolderId = props.authenticationState.user.root_folder_id;
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder;
  const isRootFolder = currentFolderId === rootFolderId;

  useEffect(() => {
    if (!props.filesState.folderContent) {
      props.dispatch(fileActions.getFolderContent(rootFolderId));
    }
  }, []);

  const isUploading = props.filesState.isUploadingFileName;
  const isEmptyFolder =
    folderList.length === 0 &&
    fileList.length === 0 &&
    filesUploading.length === 0 &&
    filesUploaded.length === 0 &&
    !isUploading;

  const windowWidth = Dimensions.get('window').width;
  const totalColumns = Math.min(Math.max(Math.trunc(windowWidth / 125), 2), 6);

  return (
    <FlatList
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            if (!props || !props.filesState || !props.filesState.folderContent) {
              return setRefreshing(false);
            }

            props.dispatch(fileActions.getFolderContent(currentFolderId));
          }}
        />
      }
      key={props.isGrid ? '#' : '-'}
      numColumns={props.isGrid ? totalColumns : 1}
      collapsable={true}
      contentContainerStyle={isEmptyFolder && tailwind('h-full justify-center')}
      ListEmptyComponent={
        props.filesState.loading ? (
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
      data={[...filesUploading, ...folderList, ...fileList, ...filesUploaded]}
      renderItem={(item) => {
        return (
          <FileItem
            isFolder={!!item.item.parentId}
            key={`${props.isGrid}-${item.item.id}`}
            item={item.item}
            isGrid={props.isGrid}
            totalColumns={totalColumns}
          />
        );
      }}
    />
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileList);
