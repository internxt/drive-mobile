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

interface PhotoListProps {
  title: string
  photos: IPhoto[]
  photosState?: any
  authenticationState?: any
  dispatch?: any
  navigation: any
}

function PhotoList(props: PhotoListProps) {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<IPhoto[]>()

  useEffect(() => {
    setPhotos(props.photosState.photos)
    setIsLoading(props.photosState.isLoading)
  }, [props.photosState.photos]);

  return (
    <View style={styles.container}>
      {
        !isLoading ?
          <FlatList
            data={photos}
            renderItem={({ item }) => (
              <View
                // eslint-disable-next-line react-native/no-inline-styles
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  margin: 1
                }}>
                <TouchableOpacity
                  style={styles.imageView}
                  key={item.id}
                  onPress={async () => {
                    const e = await MediaLibrary.getAssetInfoAsync(item)

                    FileViewer.open(e.localUri)
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