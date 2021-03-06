import React, { useState } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { StyleSheet, Image, Dimensions, ActivityIndicator, Text, View } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import * as MediaLibrary from 'expo-media-library';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const deviceWidth = Dimensions.get('window').width

interface PhotoProps {
  badge?: JSX.Element
  item: MediaLibrary.Asset
}

export default function Photo(props: PhotoProps): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const item: MediaLibrary.AssetInfo = props.item;

  return <TouchableOpacity
    style={styles.imageView}
    key={item.id}
    onPress={() => {
      MediaLibrary.getAssetInfoAsync(item).then((res) => {
        FileViewer.open(res.localUri || '')
      }).catch(() => { })
    }}
  >
    <Image
      onLoadEnd={() => setIsLoaded(true)}
      style={[styles.image]}
      source={{ uri: item.localUri }}
    />
    {!isLoaded
      ? <ActivityIndicator color='gray' size='small' style={styles.badge} />
      : <View style={styles.badge}>
        {props.badge || <></>}
      </View>}
  </TouchableOpacity>
}

const styles = StyleSheet.create({
  imageView: {
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5'),
    backgroundColor: 'white',
    borderRadius: 10
  },
  image: {
    width: (deviceWidth - wp('3.5')) / 3,
    height: (deviceWidth - wp('3.5')) / 3,
    borderRadius: 10
  },
  badge: {
    position: 'absolute'
  }
});