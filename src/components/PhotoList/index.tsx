/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Image, Text } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import FileViewer from 'react-native-file-viewer'
import { WaveIndicator } from 'react-native-indicators'
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { downloadPhoto } from '../../screens/Home/init';

export interface IPhoto {
  id: string
  modificationTime: number
  uri: any
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
  uri: string
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

  useEffect(() => {
    setIsLoading(props.photosState.isLoading)
  }, [props.photosState.localPhotos]);

  return (
    <View style={styles.container}>
      {
        !isLoading ?
          <FlatList
            data={props.photos}
            renderItem={({ item }) => (
              <View
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  margin: 1
                }}>
                <TouchableOpacity
                  style={styles.imageView}
                  key={item.id}
                  onPress={async () => {
                    //console.log('on Press =>', item)
                    downloadPhoto(props, item)
                  }}>
                  <Image
                    style={{ width: 100, height: 100, borderRadius: 10 }}
                    source={{ uri: item.uri }}
                  />
                </TouchableOpacity>
              </View>
            )}
            //Setting the number of column
            horizontal={true}
            keyExtractor={(item, index) => index.toString()}
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
    borderRadius: 2,
    marginRight: 4
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)