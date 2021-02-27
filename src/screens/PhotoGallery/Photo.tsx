import React, { useEffect, useState } from 'react'
import { StyleSheet, Image, Dimensions, View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as MediaLibrary from 'expo-media-library';
import FileViewer from 'react-native-file-viewer';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { downloadPhoto } from '../Home/init';

export interface IAlbumImage {
  id?: string
  uri: string
  isSynced: string
  isUploaded: string
  photo: any
}

const deviceWidth = Dimensions.get('window').width

function Photo(props: IAlbumImage): JSX.Element {
  const icons = {
    'download'  : require('../../../assets/icons/photos-icon-download.png'),
    'upload'    : require('../../../assets/icons/photos-icon-upload.png')
  }
  const icon = props.isUploaded ? icons.download : icons.upload
  const regEx = 'file:///'
  const [uri, setUri] = useState(props.uri)

  useEffect(() => {
    if (uri) {
      uri.match(regEx) ? null : setUri(regEx + uri)
    }
  }, [])

  return (
    <View style={{ paddingHorizontal: wp('0.5') }}>
      <TouchableOpacity
        key={props.id}
        onPress={async () => {
          if (props.id) {
            await MediaLibrary.getAssetInfoAsync(props).then((res) => {
              FileViewer.open(res.localUri || '')

            }).catch(err => {})

          } else {
            downloadPhoto(props.photo)
          }
        }}
        style={styles.container}
      >
        <Image
          style={styles.image}
          source={{ uri: uri }}
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
    width: (deviceWidth - wp('6')) / 4,
    height: (deviceWidth - wp('6')) / 4,
    marginHorizontal: wp('0.1'),
    marginVertical: wp('0.5')
  },
  image: {
    width: (deviceWidth - wp('6')) / 4,
    height: (deviceWidth - wp('6')) / 4,
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