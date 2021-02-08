import prettysize from 'prettysize';
import React, { useState } from 'react'
import { Alert, Image, Platform, StyleSheet, Text, View } from 'react-native'
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox'
//import TimeAgo from 'react-native-timeago';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import RNFetchBlob from 'rn-fetch-blob';
import PhotoItem from '../../components/PhotoItem';
//import analytics, { getLyticsData } from '../../helpers/lytics';
import Separator from '../../components/Separator'
import { deviceStorage } from '../../helpers';
import { layoutActions, PhotoActions } from '../../redux/actions';
import OptionItem from '../AlbumDetailsModal/OptionItem';

interface PhotoDetailsProps {
  dispatch?: any
  photosState?: any
  layoutState?: any
}

async function handleDownload(props: PhotoDetailsProps, setProgress: React.Dispatch<React.SetStateAction<number>>) {
  // Dispatch file download start
  props.dispatch(PhotoActions.downloadSelectedPhotoStart())
  const photoItem = props.photosState.selectedPhoto;

  try {
    //const userData = await getLyticsData()

    /*analytics.track('file-download-start', {
      file_id: props.item.id,
      file_size: props.item.size,
      file_type: props.item.type,
      email: userData.email,
      folder_id: props.item.folderId,
      platform: 'mobile'
    })*/
  } catch (error) { }

  const xToken = await deviceStorage.getItem('xToken')
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')

  return RNFetchBlob.config({
    appendExt: photoItem.type,
    path: RNFetchBlob.fs.dirs.DocumentDir + '/' + photoItem.name + '.' + photoItem.type,
    fileCache: true
  }).fetch('GET', `${process.env.REACT_NATIVE_API_URL}/api/photos/storage/photo/${photoItem.photoId}`, {
    'Authorization': `Bearer ${xToken}`,
    'internxt-mnemonic': xUserJson.mnemonic
  }).progress((received) => {
    setProgress(received)
  }).then(async (res) => {
    if (res.respInfo.status === 200) {
      /*FileViewer.open(res.path()).catch(err => {
        Alert.alert('Error opening photo', err.message)
      })*/
    } else {
      Alert.alert('Error downloading photo')
    }

    try {
      //const userData = await getLyticsData()

      /*analytics.track('file-download-finished', {
        file_id: props.item.id,
        file_size: props.item.size,
        file_type: props.item.type,
        email: userData.email,
        folder_id: props.item.folderId,
        platform: 'mobile'
      })*/
    } catch (error) { }

  }).catch(async err => {
    try {
      /*const userData = await getLyticsData()

      analytics.track('file-download-error', {
        file_id: props.item.id,
        file_size: props.item.size,
        file_type: props.item.type,
        email: userData.email,
        folder_id: props.item.folderId,
        platform: 'mobile',
        msg: err && err.message
      })*/
    } catch (error) { }

  }).finally(() => {
    // Dispatch download file end
    props.dispatch(PhotoActions.downloadSelectedPhotoStop())
  })
}

function PhotoDetailsModal(props: PhotoDetailsProps) {
  const [originalPhotoName, setOriginalPhotoName] = useState('')
  const [newPhotoName, setNewPhotoName] = useState('')
  const [progress, setProgress] = useState(0)

  const photoItem = props.photosState.selectedPhoto;
  /*const selectedItems = useSelector(state => state.pic.selectedPics)
  const showModal = useSelector(state => state.layout.showPicModal) && selectedItems.length > 0
  const pic = selectedItems[0]
  const isAlbum = pic && !selectedItems[0].id
  const album = isAlbum && pic*/

  return (
    <Modal
      position={'bottom'}
      swipeArea={60}
      swipeToClose={true}
      style={styles.modalSettingsFile}
      isOpen={props.layoutState.showPhotoDetailsModal}
      onOpened={() => {
        setOriginalPhotoName(photoItem.name)
        setNewPhotoName(originalPhotoName)
      }}
      onClosed={async () => {
        props.dispatch(PhotoActions.deselectAll())
        props.dispatch(layoutActions.closeSelectPhotoModal())

        const metadata: any = {}

        /*if (pic.filename !== inputPhotoName) {
            metadata.itemName = inputPhotoName
            //await updateFileMetadata(metadata, file.fileId)
            //props.dispatch(getFolderContent(props.picState.folderContent.currentFolder))
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
      animationDuration={200}
      backdropOpacity={0.5}
    >

      <TextInput
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 20,
          marginLeft: 26,
          marginTop: 30
        }}
        onChangeText={value => setNewPhotoName(value)}
        value={newPhotoName}
      />

      <Separator />

      <Text
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 15,
          paddingLeft: 26,
          paddingBottom: 6
        }}
      >
        <Text
          style={styles.propText}
        >Type: </Text>
        <Text style={styles.detailsText}>
          {photoItem ?
            photoItem.type
            :
            'jpg'}
        </Text>
      </Text>

      <Text
        style={{
          fontFamily: 'Averta-Semibold',
          fontSize: 15,
          paddingLeft: 26,
          paddingBottom: 6
        }}
      >
        <Text style={styles.propText} >Added: </Text>
        <Text style={styles.detailsText}>
          {photoItem ?
            photoItem.createdAt
            :
            '0000000'}
        </Text>
      </Text>

      <Text
        style={{
          fontFamily: 'Averta-Bold',
          fontSize: 15,
          paddingLeft: 26,
          paddingBottom: 6
        }}
      >
        <Text style={styles.propText} >Size: </Text>
        <Text style={styles.detailsText}>
          {photoItem ?
            photoItem.size
            :
            '1000'}
        </Text>
      </Text>

      <Separator />

      <OptionItem
        text={'Download'}
        onClick={() => {
          //setIsLoading(true)
          handleDownload(props, setProgress).finally(() => {
            setProgress(0)
            //setIsLoading(false)
          })
        }}

      />

      <OptionItem
        text={'Share'}
        onClick={() => {
          /* shareFile(props.filesState.selectedFile); */
        }}

      />

      <OptionItem
        text={'Add Item To'}
        onClick={() => {
          props.dispatch(layoutActions.closeSelectPhotoModal());
          props.dispatch(layoutActions.openAddItemModal());
        }}

      />

      <OptionItem
        text={'Delete'}
        onClick={() => {
          /*
          modalDeleteFiles.current.open();
          */
          //props.dispatch(closePicModal())
        }}

      />

    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoDetailsModal)

const styles = StyleSheet.create({
  modalSettingsFile: {
    top: '25%',
    borderRadius: 8
  },
  propText: {
    color: '#9c9c9c',
    fontFamily: 'Averta-Semibold',
    fontSize: 16

  },
  detailsText: {
    fontFamily: 'Averta-Bold',
    fontSize: 17,
    letterSpacing: -0.09,
    color: 'black'
  }
})