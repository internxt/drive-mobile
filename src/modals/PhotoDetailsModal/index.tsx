import prettysize from 'prettysize';
import React, { useState } from 'react'
import { Image, Platform, StyleSheet, Text, View } from 'react-native'
import { TextInput, TouchableHighlight } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox'
//import TimeAgo from 'react-native-timeago';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
//import analytics, { getLyticsData } from '../../helpers/lytics';
import Separator from "../../components/Separator"
import { getIcon } from "../../helpers/getIcon"
import OptionItem from '../AlbumDetailsModal/OptionItem';


interface PhotoDetailsProps {
    dispatch?: any
    photosState?: any
    layoutState?: any
  }

function PhotoDetailsModal(props: PhotoDetailsProps) {
    const [originalPhotoName, setOriginalPhotoName] = useState('')
    const [newPhotoName, setNewPhotoName] = useState('')

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
                setOriginalPhotoName("Mum & Oscar")
                setNewPhotoName(originalPhotoName)
            }}
            onClosed={async () => {
                //props.dispatch(deselectAll())
                //props.dispatch(closePicModal())

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
                    PNG
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
                    0000000
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
                    1000
                    </Text>
            </Text>

            <Separator />

            <OptionItem
                text={'Download'}
                onClick={() => {
                    //props.dispatch(openMoveFilesModal());
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
                    //props.dispatch(openMoveFilesModal());
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
    colorButton: {
        height: 27,
        width: 27,
        borderRadius: 15,
        marginLeft: 9,
        marginRight: 9,
        justifyContent: 'center',
        alignItems: 'center'
    },
    propText: {
        color: '#9c9c9c',
        fontFamily: 'Averta-Semibold',
        fontSize: 16,
        
    },
    detailsText: {
        fontFamily: 'Averta-Bold',
        fontSize: 17,
        letterSpacing: -0.09,
        color: 'black'
    },
    iconImage: {
        width: 22,
        height: 22
    }
})