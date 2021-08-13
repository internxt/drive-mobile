import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect, useSelector } from 'react-redux';
import strings from '../../../assets/lang/strings';
import Separator from '../../components/Separator';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import Folder from './Folder';

function MoveFilesModal(props: Reducers) {
  const { filesState, layoutState } = useSelector<any, Reducers>(s => s);

  const [isOpen, setIsOpen] = useState(layoutState.showMoveModal)
  const [currentfolderid, setCurrentFolderId] = useState('')
  const [folderlist, setFolderList] = useState(Array)
  const [firstfolder, setFirstFolder] = useState('')
  const [selectedfile, setSelectedFile] = useState({})

  const { rootFolderContent } = filesState
  const folderList: any[] = rootFolderContent && rootFolderContent.children || []

  useEffect(() => {
    layoutState.showMoveModal === true ? setIsOpen(true) : null
    if (filesState.folderContent) {
      setCurrentFolderId(filesState.folderContent.currentFolder)
      setSelectedFile(filesState.selectedFile)
      setFolderList(filesState.rootFolderContent.children)
      setFirstFolder(filesState.folderContent.currentFolder)
    }
  }, [layoutState.showMoveModal])

  useEffect(() => {
    if (filesState.folderContent) {
      setCurrentFolderId(filesState.folderContent.currentFolder)
      setFolderList(filesState.folderContent.children)
    }
  }, [filesState.folderContent])

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
        <Text style={styles.title}>{strings.modals.move_modal.title}</Text>
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
          <Text style={styles.text}>{strings.components.buttons.cancel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.blue]}
          onPress={() => {
            moveFile(currentfolderid)
          }}
        >
          <Text style={[styles.text, styles.white]}>{strings.components.buttons.move}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blue: {
    backgroundColor: '#4585f5'
  },
  breadcrumbs: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: Platform.OS === 'ios' ? wp('14') : 0
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center'
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderRadius: 8,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: wp('40')
  },
  container: {
    flex: 1
  },
  folderList: {
    height: '75%'
  },
  text: {
    color: '#5c6066',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16
  },
  title: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    margin: 20
  },
  white: {
    color: '#fff'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(MoveFilesModal)