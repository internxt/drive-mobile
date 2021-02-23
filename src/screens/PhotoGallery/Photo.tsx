import React from 'react'
import { StyleSheet, Image, Dimensions, Platform } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import FileViewer from 'react-native-file-viewer';
import * as MediaLibrary from 'expo-media-library';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

export interface IAlbumImage {
  id: string
  uri: string
}
const deviceWidth = Dimensions.get('window').width

function Photo(props: IAlbumImage): JSX.Element {
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
    width: (deviceWidth - 20) / 3,
    height: (deviceWidth - 20) / 3,
    marginHorizontal: wp('0.5'),
    marginBottom: wp('1')
  },
  image: {
    width: (deviceWidth - 20) / 3,
    height: (deviceWidth - 20) / 3,
    borderRadius: 10
  }
})

export default Photo