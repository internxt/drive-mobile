import React, { useEffect, useState } from 'react'
import { StyleSheet, Image, Dimensions, View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import FileViewer from 'react-native-file-viewer';
import * as MediaLibrary from 'expo-media-library';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

export interface IAlbumImage {
  id: string
  uri: string
  isSynced: string
  isUploaded: string
}
const deviceWidth = Dimensions.get('window').width

function Photo(props: IAlbumImage): JSX.Element {
  const icons = {
    'download'  : require('../../../assets/icons/photos-icon-download.png'),
    'upload'    : require('../../../assets/icons/photos-icon-upload.png')
  }
  const icon = props.isUploaded ? icons.download : icons.upload

  //console.log(props.isUploaded)
  return (
    <View>
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

      {
        !props.isSynced ?
          <View style={styles.iconBackground}>
            <Image style={styles.icon} source={icon} />
          </View>
          :
          null
      }
    </View>
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
  },
  iconBackground: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 30 / 2,
    backgroundColor: '#4385F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: wp('1'),
    marginLeft: wp('1')
  },
  icon: {
    height: 22,
    width: 22
  }
})

export default Photo