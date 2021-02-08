import React, { Component, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
//import { BackButton } from '../../components/BackButton';
//import { SettingsButton } from '../../components/SettingsButton';
import PhotoItem from '../../components/PhotoItem';
//import SourceList from '../../lib/getAssets';
//import { layoutActions, photoActions, updateCursor } from '../../redux/actions';
import { connect, useDispatch } from 'react-redux';
import { TouchableOpacity } from 'react-native-gesture-handler';
//import { IPhoto } from '../../components/FileList';
import SourceList from '../../helpers/getAssets';
import { BackButton } from '../../components/BackButton';
import MenuItem from '../../components/MenuItem';
import { layoutActions } from '../../redux/actions';
import AlbumDetailsModal from '../../modals/AlbumDetailsModal';
import AddItemToModal from '../../modals/AddItemToModal'
import PhotoDetailsModal from '../../modals/PhotoDetailsModal';
import AlbumMenuItem from '../../components/MenuItem/AlbumMenuItem';
interface AlbumViewProps {
  route: any;
  navigation?: any
  photosState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

function AlbumView(props: AlbumViewProps): JSX.Element {
  const [refreshing, setRefreshing] = useState(false);

  const keyExtractor = (item: any, index?: any) => index.toString();
  const renderItem = ({ item }: { item: any }) => (
    <Pressable>
      <PhotoItem item={item} isLoading={false} />
    </Pressable>
  );

  return (
    <View style={styles.container}>

      <AlbumDetailsModal />
      <AddItemToModal />
      <PhotoDetailsModal />

      <View style={styles.albumHeader}>
        <BackButton navigation={props.navigation} />

        <View style={styles.titleWrapper}>
          <Text style={styles.albumTitle}>
            {props.navigation.state.params.title}
          </Text>
          <Text style={styles.photosCount}>
            {props.photosState.photos.length} Photos
          </Text>
        </View>

        <AlbumMenuItem name={'details'} onClickHandler={() => {
          props.dispatch(layoutActions.openAlbumModal());
        }} />
      </View>

      <View >
        <FlatList
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          data={props.photosState.photos}
          contentContainerStyle={styles.items}
          showsVerticalScrollIndicator={false}
          horizontal={false}
          numColumns={3}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true)
            //const index = props.filesState.cursor;
            //const result = await getPhotos(index);
            //updateCursor(result.index)
            setRefreshing(false)
          }}
        ></FlatList>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    backgroundColor: '#fff',
    paddingTop: 0,
    paddingBottom: 15,
    marginBottom: 0
  },
  items: {
    display: 'flex',
    justifyContent: 'center',
    paddingLeft: 5

  },
  albumHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    paddingVertical: 7,
    paddingHorizontal: 20,
    height: '8%'
  },
  albumTitle: {
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    letterSpacing: 0,
    color: '#000000',
    textAlign: 'center'

  },
  photosCount: {
    fontFamily: 'Averta-Regular',
    fontSize: 13,
    letterSpacing: 0,
    paddingTop: 5,
    color: '#bfbfbf',
    textAlign: 'center'
  },
  titleWrapper: {
    display: 'flex'
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AlbumView);