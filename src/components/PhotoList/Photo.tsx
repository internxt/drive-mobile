import React, { useState } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { StyleSheet, Image, Dimensions, ActivityIndicator } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import * as MediaLibrary from 'expo-media-library';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const deviceWidth = Dimensions.get('window').width

export default function Photo(props: any) {
  const [isLoaded, setIsLoaded] = useState(false);
  const item: MediaLibrary.AssetInfo = props.item;

  return <TouchableOpacity
    style={styles.imageView}
    key={item.id}
    onPress={async () => {
      await MediaLibrary.getAssetInfoAsync(item).then((res) => {
        FileViewer.open(res.localUri || '')
      }).catch(err => { })
    }}
  >
    <Image
      onLoadEnd={() => setIsLoaded(true)}
      style={[styles.image]}
      source={{ uri: item.localUri }}
    />
    {!isLoaded ? <ActivityIndicator color='gray' size='small' style={styles.activityIndicator} /> : <></>}
  </TouchableOpacity>
}

const styles = StyleSheet.create({
  imageView: {
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5')
  },
  image: {
    width: (deviceWidth - wp('6')) / 3,
    height: (deviceWidth - wp('6')) / 3,
    borderRadius: 10
  },
  activityIndicator: {
    position: 'absolute'
  }
});