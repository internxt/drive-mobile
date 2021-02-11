/* eslint-disable react-native/no-unused-styles */
import React, { useEffect, useState } from 'react'
import { StyleSheet, View, Image, Platform } from 'react-native';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import * as Permissions from 'expo-permissions';
import * as MediaLibrary from 'expo-media-library';
import FileViewer from 'react-native-file-viewer'

export interface IPhoto {
  id: string
  modificationTime: string
  uri: any
  filename: string
  duration: number
  width: string
  heigh: number
  bucket?: string
  creationTime?: Date
  mediaSubTypes: any
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

  const photoList: IPhoto[] = props.photos || [];

  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [image, setImage] = useState<IPhoto[]>([]);

  const getImages = () => {
    return Permissions.askAsync(Permissions.MEDIA_LIBRARY)
      .then(() => {
        return MediaLibrary.getAssetsAsync();
      })
      .then((result) => {
        return result.assets;
      });
  };

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('loading photos');
    getImages().then((res) => {
      setImages(res)
      setIsLoading(false)
    }
    );
  }, []);

  useEffect(() => {
  }, [images]);

  return (
    <View>
      <FlatList
        data={images}
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
                style={{ width: 100, height: 100 }}
                source={{ uri: item.uri }}
              />
            </TouchableOpacity>
          </View>
        )}
        //Setting the number of column
        horizontal={true}
        keyExtractor={(item, index) => index.toString()}
      />
    </View>

  )
}
const styles = StyleSheet.create({
  imageView: {
    borderRadius: 2,
    marginRight: 4
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(PhotoList)