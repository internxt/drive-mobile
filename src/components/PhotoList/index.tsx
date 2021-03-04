/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Image, Text, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { WaveIndicator } from 'react-native-indicators'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as MediaLibrary from 'expo-media-library';
import FileViewer from 'react-native-file-viewer';
import AlbumView from '../../screens/AlbumView';
import { PhotosState } from '../../redux/reducers/photos.reducer';

export interface IPhoto {
  id: string
  modificationTime: number
  localUri: any
  filename: string
  duration: number
  width: number
  bucket?: string
  creationTime?: number
}

export interface IPreview {
  data: string
  photoId: number
  type: string
  localUri: string
}

interface PhotoListProps {
  title: string
  photos: IPhoto[]
  photosState: PhotosState
  authenticationState?: any
  dispatch?: any
  navigation: any
  onRefresh?: any
}

const deviceWidth = Dimensions.get('window').width

function PhotoList(props: PhotoListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  return (
    <View style={styles.container}>
      {
        !isLoading ?
          <FlatList
            refreshControl={<RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                if (props.onRefresh) {
                  props.onRefresh();
                }
                setRefreshing(false)
              }}
            />}
            data={props.photos}
            //onEndReachedThreshold={0.1}
            //onEndReached={() => {
            //  getLocalImages(props.dispatch, false, props.photosState.localPhotos[props.photosState.localPhotos.length - 1].id)
            //}}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  style={styles.imageView}
                  key={item.id}
                  onPress={async () => {
                    await MediaLibrary.getAssetInfoAsync(item).then((res) => {
                      FileViewer.open(res.localUri || '')
                    }).catch(err => { })
                  }}
                >
                  <Image
                    style={styles.image}
                    source={{ uri: item.localUri }}
                  />
                </TouchableOpacity>
              )
            }}
            contentContainerStyle={styles.flatList}
            keyExtractor={(item, index) => index.toString()}
            numColumns={3}
          />
          :
          <ScrollView
            style={styles.emptyContainer}
            refreshControl={<RefreshControl refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(false)
              }}
            />}>
            <Text style={styles.heading}>Loading photos from gallery...</Text>
            <WaveIndicator color="#5291ff" size={50} />
          </ScrollView>
      }
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: wp('5')
  },
  imageView: {
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5')
  },
  image: {
    width: (deviceWidth - wp('6')) / 3,
    height: (deviceWidth - wp('6')) / 3,
    borderRadius: 10
  },
  flatList: {
    paddingHorizontal: wp('0.5')
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#f00'
  },
  heading: {
    fontFamily: 'Averta-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    color: '#000000',
    marginVertical: 10
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)