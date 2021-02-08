import React, { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Image, BackHandler, Platform, FlatList, Pressable } from 'react-native'
import AppMenu from '../../components/AppMenu'
import { layoutActions, fileActions } from '../../redux/actions';
import { connect } from 'react-redux';
import FileList, { IFolder, IFile } from '../../components/FileList';
import SettingsModal from '../../modals/SettingsModal';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { getIcon } from '../../helpers/getIcon';
//import FileDetailsModal from '../../modals/PhotoDetailsModal';
import SortModal from '../../modals/SortModal';
import DeleteItemModal from '../../modals/DeleteItemModal';
import MoveFilesModal from '../../modals/MoveFilesModal';
import ShareFilesModal from '../../modals/ShareFilesModal';
import { Reducers } from '../../redux/reducers/reducers';
import FileDetailsModal from '../../modals/FileDetailsModal';
import PhotoItem from '../../components/PhotoItem';
import AlbumCard from '../../components/AlbumCard';
import { getDevicePhotos } from '../../helpers/mediaAccess';
import { PhotoActions } from '../../redux/actions/photo.actions';
import PhotoList from '../../components/PhotoList';
import { previewsStorage } from '../../helpers/previewsStorage';
import { getAlbumList, getAllPhotos, getDeletedPhotos } from './init';
import * as FileSystem from 'expo-file-system';
import CreateAlbumCard from '../../components/AlbumCard/CreateAlbumCard';
import DeletedPhotoList from '../../components/PhotoList/DeletedPhotoList';
import SettingsModalPhotos from '../../modals/SettingsModal/SettingsModalPhotos';
import AppMenuPhotos from '../../components/AppMenu/AppMenuPhotos';

interface HomeProps extends Reducers {
  navigation?: any
  dispatch?: any
  photosState: any
  authenticationState: any
}

function Home(props: HomeProps): JSX.Element {
  const [selectedKeyId, setSelectedKeyId] = useState(0)

  useEffect(() => {
    const { user } = props.authenticationState;
    const { token } = props.authenticationState;

    props.dispatch(PhotoActions.getAllPhotosContent(props.authenticationState.user));
    props.dispatch(PhotoActions.getDeletedPhotos(props.authenticationState.user));

    getDevicePhotos(props.authenticationState.user.rootAlbumId, '0').then((dataResult) => {
      props.dispatch(PhotoActions.updateCursor(parseInt(dataResult?.index || '20')));
      props.dispatch(PhotoActions.getDevicePhotos(dataResult?.photos));

      // TODO: Store previews on file://.../previews.
    }).catch((err) => {

    })
  }, [])

  // Get device photos to upload new content
  useEffect(() => {
    if (props.photosState.devicePhotos.length > 0) {

    }
  }, [props.photosState.devicePhotos])

  /*useEffect(() => {
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
  }, []);*/

  useEffect(() => {
    //parentFolderId === null ? props.dispatch(fileActions.setRootFolderContent(props.filesState.folderContent)) : null

  }, [props.photosState.albums])

  useEffect(() => {
    const keyId = props.photosState.selectedItems.length > 0 && props.photosState.selectedItems[0].id

    setSelectedKeyId(keyId)
  }, [props.photosState])

  if (!props.authenticationState.loggedIn) {
    props.navigation.replace('Login')
  }

  const keyExtractor = (item: any, index: any) => index.toString();
  // TODO: Recover all previews from device,
  // when the server request finish
  const renderAlbumItem = ({ item }) => (
    <Pressable
      onPress={() => {
        props.navigation.navigate('AlbumView', { title: item.name })
      }}
      onLongPress={() => { }}
    >
      <AlbumCard withTitle={true} navigation={props.navigation} />
    </Pressable>

  );

  return <View style={styles.container}>
    <SettingsModalPhotos navigation={props.navigation} />
    <SortModal />
    <MoveFilesModal />

    <View style={styles.platformSpecificHeight}></View>

    <AppMenuPhotos navigation={props.navigation} />

    <View style={styles.albumsContainer}>
      <View style={styles.albumsHeader}>
        <Text style={styles.albumsTitle}>
          Albums
        </Text>

        <Pressable
          onPress={() => { props.dispatch(layoutActions.openSortPhotoModal()) }}
        >
          <Text style={styles.albumsSort}>
            {props.photosState.sortType}
          </Text>
        </Pressable>

      </View>

      {props.photosState.albums.length > 0 ?
        <View style={styles.photoScroll}>
          <FlatList
            keyExtractor={keyExtractor}
            renderItem={renderAlbumItem}
            data={props.photosState.albums}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
          ></FlatList>
        </View>
        :
        <View style={{ marginTop: 40 }}>
          <CreateAlbumCard navigation={props.navigation} />
        </View>
      }
    </View>

    <View style={styles.albumsContainer}>
      <View style={styles.albumHeader}>
        <Text style={styles.albumsTitle}>
          All Photos
        </Text>
        <Pressable
          onPress={() => { props.dispatch(layoutActions.openSortPhotoModal()) }}
        >
          <Text style={styles.albumsSort}>
            {props.photosState.sortType}
          </Text>
        </Pressable>

      </View>

      <TouchableHighlight
        style={styles.photoScroll}
        underlayColor="#FFF"
        onPress={() => { props.navigation.navigate('AlbumView', { title: 'All Photos' }) }}
      >
        <PhotoList
          title={'All Photos'}
          photos={props.photosState.photos}
          navigation={props.navigation}
        />
      </TouchableHighlight>
    </View>

    <View style={styles.albumsContainer}>
      <TouchableHighlight
        underlayColor="#FFF"
      >
        <View>
          <View style={styles.albumHeader}>
            <Text style={styles.albumsTitle}>
              Deleted
            </Text>
            <Pressable
              onPress={() => { props.dispatch(layoutActions.openSortPhotoModal()) }}
            >
              <Text style={styles.albumsSort}>
                {props.photosState.sortType}
              </Text>
            </Pressable>
          </View >

          <TouchableHighlight
            style={styles.photoScroll}
            underlayColor="#fff"
            onPress={() => { props.navigation.navigate('AlbumView', { title: 'Deleted Photos' }) }}
          >
            <DeletedPhotoList
              title={'Deleted Photos'}
              deleted={props.photosState.deleted}
              navigation={props.navigation}
            />
          </TouchableHighlight>
        </View>
      </TouchableHighlight>
    </View>
  </View>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Home)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fff'
  },
  photoScroll: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: 25
  },
  albumsContainer: {
    display: 'flex',
    paddingHorizontal: 0,
    paddingVertical: 10

  },
  albumsHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 10

  },
  albumHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10
  },
  albumsTitle: {
    fontFamily: 'Averta-Bold',
    fontSize: 18,
    letterSpacing: -0.13,
    paddingTop: 10,
    color: 'black',
    alignSelf: 'flex-start',
    height: 30
  },
  albumsSort: {
    fontFamily: 'Averta-Semibold',
    fontSize: 14,
    letterSpacing: -0.13,
    paddingTop: 10,
    color: '#bfbfbf',
    alignSelf: 'flex-end',
    height: 30,
    width: 50
  },
  platformSpecificHeight: {
    height: Platform.OS === 'ios' ? '5%' : '0%'
  }
});