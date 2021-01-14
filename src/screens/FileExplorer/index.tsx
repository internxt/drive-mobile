import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Image, BackHandler, Platform } from 'react-native'
import AppMenu, { uploadFile } from '../../components/AppMenu'
import { fileActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList, { IFolder } from '../../components/FileList';
import SettingsModal from '../../modals/SettingsModal';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { getIcon } from '../../helpers/getIcon';
import FileDetailsModal from '../../modals/FileDetailsModal';
import SortModal from '../../modals/SortModal';
import DeleteItemModal from '../../modals/DeleteItemModal';
import MoveFilesModal from '../../modals/MoveFilesModal';
import ShareFilesModal from '../../modals/ShareFilesModal';
import { Reducers } from '../../redux/reducers/reducers';

interface FileExplorerProps extends Reducers {
  navigation?: any
  dispatch?: any
  image?: any
}

function FileExplorer(props: FileExplorerProps): JSX.Element {
  const [selectedKeyId, setSelectedKeyId] = useState(0)

  const { filesState } = props;
  //const currentFolderId = props.navigation.state.params.folderId;
  const parentFolderId = (() => {
    if (props.filesState.folderContent) {
      return props.filesState.folderContent.parentId || null
    } else {
      return null
    }
  })()

  useEffect(() => {
    parentFolderId === null ? props.dispatch(fileActions.setRootFolderContent(filesState.folderContent)) : null

    if (filesState.uri !== undefined && filesState.uri !== null && filesState.uri !== '') {
      if (filesState.folderContent) {
        console.log('(filesState)', filesState.folderContent.currentFolder)
        const uri = filesState.uri
        const regex = /inxt:\/\//g
        const found = uri.match(regex)

        console.log('found', found)
        setTimeout(() => {
          !found ? uploadFile(filesState.uri, filesState.folderContent.currentFolder, props) : null
        }, 5000)
      }
    }
  }, [filesState.folderContent])

  useEffect(() => {
    const backAction = () => {
      if (parentFolderId) {
        // eslint-disable-next-line no-console
        console.log('back') // do not delete
        // Go to parent folder if exists
        props.dispatch(fileActions.getFolderContent(parentFolderId))
      } else {
        // Exit application if root folder
        BackHandler.exitApp()
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const keyId = props.filesState.selectedItems.length > 0 && props.filesState.selectedItems[0].id

    setSelectedKeyId(keyId)
  }, [filesState])

  if (!props.authenticationState.loggedIn) {
    props.navigation.replace('Login')
  }

  return <View style={styles.container}>
    <FileDetailsModal key={selectedKeyId} />
    <SettingsModal navigation={props.navigation} />
    <SortModal />
    <DeleteItemModal />
    <MoveFilesModal />
    <ShareFilesModal />

    <View style={styles.platformSpecificHeight}></View>

    <AppMenu navigation={props.navigation} />

    <View style={styles.breadcrumbs}>
      <Text style={styles.breadcrumbsTitle}>
        {filesState.folderContent && filesState.folderContent.parentId
          ? filesState.folderContent.name
          : 'All Files'}
      </Text>

      <TouchableHighlight
        underlayColor="#FFF"
        onPress={() => {
          props.dispatch(fileActions.getFolderContent(parentFolderId))
        }}>
        <View style={parentFolderId ? styles.backButtonWrapper : styles.backHidden}>
          <Image style={styles.backIcon} source={getIcon('back')} />

          <Text style={styles.backLabel}>Back</Text>
        </View>
      </TouchableHighlight>
    </View>

    <FileList />
  </View>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(FileExplorer)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff'
  },
  breadcrumbs: {
    display: 'flex',
    flexWrap: 'nowrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: '#e6e6e6',
    borderBottomWidth: 1,
    marginTop: 15,
    paddingBottom: 15
  },
  breadcrumbsTitle: {
    fontFamily: 'CircularStd-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    paddingLeft: 20,
    color: '#000000'
  },
  backButtonWrapper: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  backIcon: {
    height: 12,
    width: 8,
    marginRight: 5
  },
  backLabel: {
    fontFamily: 'CircularStd-Medium',
    fontSize: 19,
    letterSpacing: -0.2,
    color: '#000000'
  },
  backHidden: {
    display: 'none'
  },
  platformSpecificHeight: {
    height: Platform.OS === 'ios' ? '5%' : '0%'
  }
});
