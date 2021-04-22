/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Text, ScrollView, Dimensions, RefreshControl, FlatListProps, ActivityIndicator } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { WaveIndicator } from 'react-native-indicators'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import * as MediaLibrary from 'expo-media-library';
import { PhotosState } from '../../redux/reducers/photos.reducer';
import Photo from './Photo'
import EmptyPhotoList from './EmptyPhotoList';

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

interface PhotoListProps extends FlatListProps<MediaLibrary.Asset> {
  title: string
  photosState: PhotosState
  authenticationState?: any
  dispatch?: any
  navigation: any
}

const deviceWidth = Dimensions.get('window').width

function PhotoList(props: PhotoListProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadMore, setLoadMore] = useState(true);

  useEffect(() => {
    setLoadMore(false);
  }, [props.data]);

  return (
    <View style={styles.container}>
      {
        !isLoading ?
          <>
            <FlatList
              data={props.data}
              /* refreshControl={<RefreshControl
                enabled={true}
                refreshing={refreshing}
                onRefresh={() => {
                  if (props.onRefresh) {
                    props.onRefresh();
                  }
                  setRefreshing(false)
                }}
              />} */
              onEndReached={(e) => {
                if (props.onEndReached) {
                  setLoadMore(true);
                  props.onEndReached(e);
                }
              }}
              onEndReachedThreshold={0.2}
              ListEmptyComponent={props.ListEmptyComponent || <EmptyPhotoList />}
              renderItem={({ item }) => <Photo item={item} />}
              contentContainerStyle={styles.flatList}
              keyExtractor={(item) => item.id}
              numColumns={props.numColumns || 3}
            />
            <View>
              {loadMore ? <ActivityIndicator color="gray" size="small" /> : <></>}
            </View>
          </>
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
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#f00'
  },
  flatList: {
    paddingHorizontal: wp('0.5')
  },
  heading: {
    color: '#000000',
    fontFamily: 'Averta-Regular',
    fontSize: wp('4.5'),
    letterSpacing: -0.8,
    marginVertical: 10
  },
  image: {
    borderRadius: 10,
    height: (deviceWidth - wp('6')) / 3,
    width: (deviceWidth - wp('6')) / 3
  },
  imageView: {
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5')
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)