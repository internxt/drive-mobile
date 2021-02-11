import React from 'react'
import { StyleSheet, Image, Dimensions, Platform } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import FileViewer from 'react-native-file-viewer';
import * as MediaLibrary from 'expo-media-library';

export interface IAlbumImage {
  id: string
  uri: string
}
const deviceWidth = Dimensions.get('window').width

function AlbumImage(props: IAlbumImage): JSX.Element {

  return (
    <TouchableOpacity
      key={props.id}
      onPress={async () => {
        const e: MediaLibrary.AssetInfo = await MediaLibrary.getAssetInfoAsync(props)

        FileViewer.open(e.localUri || '')

      }}
      style={styles.container}
    >
      <Image
        style={styles.image}
        source={{ uri: props.uri }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: deviceWidth / 3,
    height: deviceWidth / 3,
    marginRight: 2
  },
  image: {
    width: deviceWidth / 3,
    height: deviceWidth / 3
  }
})

export default AlbumImage