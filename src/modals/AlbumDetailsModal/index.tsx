import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import Modal from 'react-native-modalbox'
//import TimeAgo from "react-native-timeago"
import { connect } from 'react-redux'
import Separator from '../../components/Separator'
import { layoutActions } from '../../redux/actions';
import OptionItem from './OptionItem';

interface AlbumDetailsProps {
  dispatch?: any
  photosState?: any
  layoutState?: any
}

function AlbumDetailsModal(props: AlbumDetailsProps) {
  const [originalAlbumName, setOriginalAlbumName] = useState('')
  const [newAlbumName, setNewAlbumName] = useState('')

  useEffect(() => {
    if (props.layoutState.showAlbumModal === true) {
      //setOriginalAlbumName(file.name)
      //setNewAlbumName(file.name)
    }
  }, [props.layoutState.showAlbumModal])

  return (
    <Modal
      position={'bottom'}
      swipeArea={60}
      style={styles.modalSettingsFile}
      isOpen={props.layoutState.showAlbumModal}
      onOpened={() => setOriginalAlbumName('Lake Trip')}
      onClosed={async () => {
        props.dispatch(layoutActions.closeAlbumModal())

        const metadata: any = {}

        /*if (pic.filename !== inputPhotoName) {
            metadata.itemName = inputPhotoName
            //await updateFileMetadata(metadata, file.fileId)
            //dispatch(getFolderContent(props.picState.folderContent.currentFolder))
            //const userData = await getLyticsData()
            /*analytics.track('file-rename', {
                userId: userData.uuid,
                email: userData.email,
                platform: 'mobile',
                device: Platform.OS,
                folder_id: file.id
            }).catch(() => { })
        }*/
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      swipeToClose={true}
      animationDuration={200}
      backdropOpacity={0.5}
    >

      <TextInput
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 20,
          marginLeft: 26,
          marginTop: 38
        }}
        onChangeText={value => setOriginalAlbumName(value)}
        value={originalAlbumName}
      />

      <Separator />

      <Text
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 17,
          paddingLeft: 26,
          paddingBottom: 6
        }}
      >
        <Text
          style={styles.propText}
        >Type: </Text>
        <Text style={{ fontFamily: 'Averta-Semibold' }}>
          photo
        </Text>
      </Text>

      <Text
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 17,
          paddingLeft: 26,
          paddingBottom: 6
        }}
      >
        <Text style={styles.propText} >Added: </Text>
        <Text style={{ fontFamily: 'Averta-Semibold' }}>
          far far ago
        </Text>
      </Text>

      <Text
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 17,
          paddingLeft: 26,
          paddingBottom: 6
        }}
      >
        <Text style={styles.propText} >Size: </Text>
        <Text style={{ fontFamily: 'Averta-Semibold', color: '#2a2c35' }}>
          2344
        </Text>
      </Text>

      <Separator />

      <OptionItem
        text={'Download'}
        onClick={() => {
          //dispatch(openMoveFilesModal());
        }}
      />

      <OptionItem
        text={'Share'}
        onClick={() => {
          //props.dispatch(closeAlbumModal())
          //props.dispatch(openShareModal())
          /*shareFile(props.filesState.selectedFile); */
        }}
      />

      <OptionItem
        text={'Sort by'}
        onClick={() => {
          props.dispatch(layoutActions.closeAlbumModal())

          props.dispatch(layoutActions.openSortPhotoModal());
        }}
      />

      <OptionItem
        text={'Delete'}
        onClick={() => {
          /*
          modalDeleteFiles.current.open();
          */
          //dispatch(closeAlbumModal())
        }}
      /></Modal>);
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumDetailsModal)

const styles = StyleSheet.create({
  modalSettingsFile: {
    top: '33%',
    borderRadius: 8,
    paddingLeft: 15
  },
  propText: {
    color: '#9c9c9c',
    fontFamily: 'Averta-Semibold',
    fontSize: 17

  }
})