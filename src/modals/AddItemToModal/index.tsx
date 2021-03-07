import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FlatList, TouchableHighlight } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox'
//import TimeAgo from 'react-native-timeago';
import { connect } from 'react-redux';

import AlbumCard from '../../components/AlbumCard';

import { layoutActions } from '../../redux/actions';
import CreateAlbumCard from '../../components/AlbumCard/CreateAlbumCard';
import SourceList from '../../helpers/getAssets';

interface AddItemToProps {
  navigation?: any
  layoutState?: any
  dispatch?: any
}

function AddItemToModal(props: AddItemToProps): JSX.Element {

  const keyExtractor = (item: any, index: any) => index.toString();
  const renderAlbumItem = ({ item }) => (
    <Pressable
      onPress={() => { props.navigation.navigate('AlbumView') }}
      style={styles.touch}
    >
      <AlbumCard withTitle={false} navigation={props.navigation} />
    </Pressable>

  );
  /*const selectedItems = useSelector(state => state.pic.selectedPics)
  const showModal = useSelector(state => state.layout.showPicModal) && selectedItems.length > 0
  const pic = selectedItems[0]
  const isAlbum = pic && !selectedItems[0].id
  const album = isAlbum && pic*/

  return (
    <Modal
      position={'bottom'}
      swipeArea={20}
      swipeToClose={true}
      style={styles.modal}
      isOpen={props.layoutState.showAddItemModal}
      onClosed={async () => {
        //dispatch(layoutActions.closePicModal())

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
      animationDuration={200}
      backdropOpacity={0.5}
    >

      <View style={styles.headerContainer}>
        <Text
          style={{
            fontFamily: 'Averta-Bold',
            fontSize: 18,
            letterSpacing: -0.16,
            color: 'black'
          }}
        >
          Add Item To Album
        </Text>

        <TouchableHighlight
          underlayColor="#FFF"
          style={styles.upgradeBtn}
          onPress={() => {
            props.dispatch(layoutActions.closeAddItemModal())
            props.navigation.navigate('AlbumView')
          }}>
          <Text style={styles.propText}>
            Done
          </Text>
        </TouchableHighlight>
      </View>

      <FlatList
        keyExtractor={keyExtractor}
        renderItem={renderAlbumItem}
        data={SourceList}
        ListHeaderComponent={CreateAlbumCard}
        horizontal={false}
        contentContainerStyle={{}}
        showsHorizontalScrollIndicator={false}
      ></FlatList>

    </Modal>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 22,
    paddingTop: 39
  },
  modal: {
    alignContent: 'center',
    borderRadius: 8,
    top: '10%'
  },
  propText: {
    color: 'white',
    fontFamily: 'Averta-Semibold',
    fontSize: 16,
    lineHeight: 26.1
  },
  touch: {
    paddingHorizontal: 0
  },
  upgradeBtn: {
    backgroundColor: '#0084ff',
    borderRadius: 23.8,
    paddingHorizontal: 18,
    paddingVertical: 5
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AddItemToModal);