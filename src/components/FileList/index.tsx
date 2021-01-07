import React, { useEffect, useState } from 'react'
import { ScrollView, Text, RefreshControl, StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { fileActions } from '../../redux/actions';
import EmptyFolder from '../EmptyFolder';
import FileItem from '../FileItem';

export interface IFolder {
  name: string
  id: number
  color: any
  icon: any
}

export interface IFile {
  bucket: string
  createdAt: Date
  folderId: number
  fileId: number
  id: number
  name: string
  type: string
  updatedAt: Date
  size: number
}

function FileList(props: any) {
  const [refreshing, setRefreshing] = useState(false)

  const { filesState } = props;
  const { folderContent } = filesState;
  let folderList: IFolder[] = folderContent && folderContent.children || [];
  let fileList: IFile[] = folderContent && folderContent.files || [];

  useEffect(() => {
    setRefreshing(false)
  }, [props.filesState.folderContent])

  const searchString = props.filesState.searchString

  if (searchString) {
    fileList = fileList.filter((file: IFile) => file.name.toLowerCase().includes(searchString.toLowerCase()))
    folderList = folderList.filter((folder: IFolder) => folder.name.toLowerCase().includes(searchString.toLowerCase()))
  }

  const sortFunction = props.filesState.sortFunction

  if (sortFunction) {
    folderList.sort(sortFunction);
    fileList.sort(sortFunction);
  }

  useEffect(() => {
    if (!props.filesState.folderContent) {
      const rootFolderId = props.authenticationState.user.root_folder_id

      props.dispatch(fileActions.getFolderContent(rootFolderId))
    }
  }, [])

  const isUploading = props.filesState.isUploadingFileName
  const isEmptyFolder = folderList.length === 0 && fileList.length === 0 && !isUploading

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            if (!props || !props.filesState || !props.filesState.folderContent) {
              return setRefreshing(false)
            }
            const currentFolder = props.filesState.folderContent.currentFolder

            props.dispatch(fileActions.getFolderContent(currentFolder))
          }}
        />
      }
      contentContainerStyle={isEmptyFolder ? styles.fileListContentsScrollView : null}
    >
      {
        isEmptyFolder ?
          <EmptyFolder />
          :
          <Text style={styles.dNone}></Text>
      }

      {
        isUploading ?
          <FileItem
            key={isUploading}
            isFolder={false}
            item={{ name: isUploading }}
            isLoading={true}
          />
          :
          null
      }

      {
        folderList.map((folder: IFolder) =>
          <FileItem
            key={folder.id}
            isFolder={true}
            item={folder}
          />
        )
      }

      {
        fileList.map((file: IFile) =>
          <FileItem
            key={file.id}
            isFolder={false}
            item={file}
          />
        )
      }
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  fileListContentsScrollView: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  dNone: {
    display: 'none'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileList)