import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { getIcon } from '../../helpers/getIcon';
import { fileActions, layoutActions } from '../../redux/actions';
import Folder from './Folder';

interface MoveFilesProps {
    layoutState?: any
    filesState?: any
    authenticationState?: any
    dispatch?: any
}

function MoveFilesModal(props: MoveFilesProps) {
  const [isOpen, setIsOpen] = useState(props.layoutState.showMoveModal)
  const [currentfolderid, setCurrentFolderId] = useState('')
  const [folderlist, setFolderList] = useState(Array)
  const [firstfolder, setFirstFolder] = useState('')
  const [selectedfile, setSelectedFile] = useState({})

  const { rootFolderContent } = props.filesState
  const folderList: any[] = rootFolderContent && rootFolderContent.children || []

  useEffect(() => {
    props.layoutState.showMoveModal === true ? setIsOpen(true) : null
    if (props.filesState.folderContent) {
      setCurrentFolderId(props.filesState.folderContent.currentFolder)
      setSelectedFile(props.filesState.selectedFile)
      setFolderList(props.filesState.rootFolderContent.children)
      setFirstFolder(props.filesState.folderContent.currentFolder)
    }
  }, [props.layoutState.showMoveModal])

  useEffect(() => {
    if (props.filesState.folderContent) {
      setCurrentFolderId(props.filesState.folderContent.currentFolder)
      setFolderList(props.filesState.folderContent.children)
    }
  }, [props.filesState.folderContent])

  const moveFile = async (result: any) => {
    // When modal is closed by move action result = folder id otherwise ans = -1
    if (result >= 0 && selectedfile) {
      setIsOpen(false)
      await props.dispatch(fileActions.moveFile(selectedfile.fileId, result))
      props.dispatch(layoutActions.closeMoveFilesModal())

      const rootFolderId = props.authenticationState.user.root_folder_id

      props.dispatch(fileActions.getFolderContent(rootFolderId))
    }
  }

  return (
    <Modal isOpen={isOpen}
      swipeArea={2}
      onClosed={() => {
        props.dispatch(layoutActions.closeMoveFilesModal())
      }}
      position='center'
      style={styles.container}
    >
      <View style={styles.breadcrumbs}>
        <Text style={styles.title}>Choose a folder to move this file.</Text>
      </View>

      <Separator />

      <View style={styles.folderList}>
        <FlatList
          data={folderlist}
          renderItem={folder => (
            <Folder
              isFolder={true}
              key={folder.item.id}
              item={folder.item}
            />
          )}
          keyExtractor={folder => folder.id.toString()}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}
          onPress={() => {
            props.dispatch(layoutActions.closeMoveFilesModal())
            setIsOpen(false)
            props.dispatch(fileActions.getFolderContent(firstfolder))
          }}
        >
          <Text style={styles.text}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.blue]}
          onPress={() => {
            moveFile(currentfolderid)
          }}
        >
          <Text style={[styles.text, styles.white]}>Move</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '100%'
  },
  breadcrumbs: {
    display: 'flex',
    flexWrap: 'nowrap',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? wp('14') : 0
  },
  title: {
    height: 30,
    fontFamily: 'CircularStd-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    color: '#000000',
    marginLeft: 20
  },
  folderList: {
    height: '75%'
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  },
  button: {
    height: 50,
    width: wp('40'),
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  blue: {
    backgroundColor: '#4585f5'
  },
  text: {
    color: '#5c6066',
    fontFamily: 'CerebriSans-Bold',
    fontSize: 16
  },
  white: {
    color: '#fff'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(MoveFilesModal)