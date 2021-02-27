/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Image, Text, ScrollView, Dimensions } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { WaveIndicator } from 'react-native-indicators'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { downloadPhoto } from '../../screens/Home/init';

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
  photosState?: any
  authenticationState?: any
  dispatch?: any
  navigation: any
}

const deviceWidth = Dimensions.get('window').width

function PhotoList(props: PhotoListProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(props.photosState.isLoading)
  }, [props.photosState.localPhotos]);

  return (
    <View style={styles.container}>
      {
        !isLoading ?
          <FlatList
            data={props.photos}
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  style={styles.imageView}
                  key={item.id}
                  onPress={async () => {
                    //downloadPhoto(props, item)
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
            horizontal={false}
          />
          :
          <WaveIndicator color="#5291ff" size={50} />
      }
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    width: '100%'
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
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)