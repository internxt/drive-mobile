import React, { useEffect, useState } from 'react'
import { ScrollView, RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import { tailwind } from '../../helpers/designSystem';
import { fileActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { EmptyFolder } from '../../screens/StaticScreens';
import FileItem from '../FileItem';

export interface IFolder {
  name: string
  id: number
  color: any
  icon: any
}

export interface IUploadingFile {
  currentFolder: number
  progress: number
  uri: string
  id: string
  type: string
  createdAt: Date
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

function FileList(props: Reducers) {
  const [refreshing, setRefreshing] = useState(false)

  const { filesState } = props;
  const { folderContent } = filesState;
  let folderList: IFolder[] = folderContent && folderContent.children || [];
  let fileList: IFile[] = folderContent && folderContent.files || [];
  const [filesUploading, setFilesUploading] = useState([])
  const [filesUploaded, setFilesUploaded] = useState([])
  const [folderId, setFolderId] = useState()

  useEffect(() => {
    setRefreshing(false)

    if (props.filesState.folderContent && props.filesState.folderContent.currentFolder) {
      setFolderId(props.filesState.folderContent.currentFolder)
    }
  }, [props.filesState.folderContent])

  useEffect(() => {
    setFilesUploading(props.filesState.filesCurrentlyUploading)
  }, [props.filesState.filesCurrentlyUploading])

  useEffect(() => {
    setFilesUploaded(props.filesState.filesAlreadyUploaded)
  }, [props.filesState.filesAlreadyUploaded])

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

  const rootFolderId = props.authenticationState.user.root_folder_id
  const currentFolderId = props.filesState.folderContent && props.filesState.folderContent.currentFolder
  const isRootFolder = currentFolderId === rootFolderId;

  useEffect(() => {
    if (!props.filesState.folderContent) {
      props.dispatch(fileActions.getFolderContent(rootFolderId))
    }
  }, [])

  const isUploading = props.filesState.isUploadingFileName
  const isEmptyFolder = folderList.length === 0 && fileList.length === 0 && filesUploading.length === 0 && filesUploaded.length === 0 && !isUploading

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            if (!props || !props.filesState || !props.filesState.folderContent) {
              return setRefreshing(false)
            }

            props.dispatch(fileActions.getFolderContent(currentFolderId))
          }}
        />
      }
      contentContainerStyle={isEmptyFolder ? tailwind('h-full justify-center') : null}
    >
      {
        isEmptyFolder ?
          <EmptyFolder {...props} isRoot={isRootFolder} /> : <></>
      }

      {
        filesUploading.length > 0 ?
          filesUploading.map((file: IUploadingFile) => {
            return file.currentFolder === folderId ?
              <FileItem
                key={filesUploading.indexOf(file)}
                isFolder={false}
                item={file}
                isLoading={true}
              />
              : <></>
          }
          )
          : <></>
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

      {
        filesUploaded.map((file: any) => {
          return file.currentFolder === folderId ?
            <FileItem
              key={file.id}
              isFolder={false}
              item={file}
            />
            :
            null
        }
        )
      }
    </ScrollView>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileList)
