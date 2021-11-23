import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect, useSelector } from 'react-redux';
import strings from '../../../../assets/lang/strings';
import FileItem from '../../FileItem';
import Separator from '../../Separator';
import { tailwind } from '../../../helpers/designSystem';
import { fileActions, layoutActions } from '../../../store/actions';
import { Reducers } from '../../../store/reducers/reducers';

function MoveFilesModal(props: Reducers) {
  const { filesState, layoutState } = useSelector<any, Reducers>((s) => s);

  const [isOpen, setIsOpen] = useState(layoutState.showMoveModal);
  const [currentfolderid, setCurrentFolderId] = useState<number>();
  const [folderlist, setFolderList] = useState([]);
  const [firstfolder, setFirstFolder] = useState<number>();
  const [selectedfile, setSelectedFile] = useState<any>({});

  const { rootFolderContent } = filesState;
  const folderList: any[] = (rootFolderContent && rootFolderContent.children) || [];

  useEffect(() => {
    props.layoutState.showMoveModal === true ? setIsOpen(true) : null;
    if (filesState.folderContent) {
      setCurrentFolderId(props.filesState.folderContent.currentFolder);
      setSelectedFile(props.filesState.selectedFile);
      setFolderList(props.filesState.rootFolderContent.children);
      setFirstFolder(props.filesState.folderContent.currentFolder);
    }
  }, [props.layoutState.showMoveModal]);

  useEffect(() => {
    if (filesState.folderContent) {
      setCurrentFolderId(filesState.folderContent.currentFolder);
      setFolderList(filesState.folderContent.children);
    }
  }, [filesState.folderContent]);

  const moveFile = async (result: any) => {
    if (result >= 0 && selectedfile) {
      setIsOpen(false);
      await props.dispatch(fileActions.moveFile(selectedfile.fileId, result));
      props.dispatch(layoutActions.closeMoveFilesModal());

      const rootFolderId = props.authenticationState.user.root_folder_id;

      props.dispatch(fileActions.getFolderContent(rootFolderId));
    }
  };

  return (
    <Modal
      isOpen={props.layoutState.showMoveModal}
      onClosed={() => {
        props.dispatch(layoutActions.closeMoveFilesModal());
      }}
      position="center"
      style={tailwind('w-11/12 h-5/6 p-3 rounded-lg')}
    >
      <View style={styles.breadcrumbs}>
        <Text style={styles.title}>{strings.modals.move_modal.title}</Text>
      </View>

      <Separator style={tailwind('my-3')} />

      <View style={tailwind('flex-grow')}>
        <FlatList
          data={folderlist}
          renderItem={(folder: any) => {
            return <FileItem totalColumns={1} key={folder.id} isFolder={true} item={folder.item} />;
          }}
          keyExtractor={(folder) => folder.id.toString()}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            props.dispatch(layoutActions.closeMoveFilesModal());
            setIsOpen(false);
            props.dispatch(fileActions.getFolderContent(firstfolder));
          }}
        >
          <Text style={styles.text}>{strings.components.buttons.cancel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.blue]}
          onPress={() => {
            moveFile(currentfolderid);
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
    backgroundColor: '#4585f5',
  },
  breadcrumbs: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: Platform.OS === 'ios' ? wp('14') : 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderRadius: 8,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: wp('40'),
  },
  text: {
    color: '#5c6066',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16,
  },
  title: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    margin: 20,
  },
  white: {
    color: '#fff',
  },
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(MoveFilesModal);
