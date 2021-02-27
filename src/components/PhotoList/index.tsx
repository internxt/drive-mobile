/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Image, Text, ScrollView } from 'react-native';
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

function PhotoList(props: PhotoListProps) {
  const [isLoading, setIsLoading] = useState(true);
  const numColums = Math.ceil(props.photos.length / 3) || 1

  useEffect(() => {
    setIsLoading(props.photosState.isLoading)
  }, [props.photosState.localPhotos]);

  return (
    <View style={styles.container}>
      {
        !isLoading ?
          <ScrollView
            horizontal
            showsVerticalScrollIndicator={false}
          >
            <FlatList
              scrollEnabled={false}
              contentContainerStyle={{ alignSelf: 'flex-start' }}
              numColumns={numColums}
              data={props.photos}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    style={styles.imageView}
                    key={item.id}
                    onPress={async () => {
                      //console.log('on Press =>', item)
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
              keyExtractor={(item, index) => index.toString()}
            />
          </ScrollView>
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
    borderRadius: 2,
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5')
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)