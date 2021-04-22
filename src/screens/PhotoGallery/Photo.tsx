import React, { useEffect, useState } from 'react'
import { StyleSheet, Image, Dimensions, View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as MediaLibrary from 'expo-media-library';
import FileViewer from 'react-native-file-viewer';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { MaterialIndicator } from 'react-native-indicators';
import { connect } from 'react-redux';

interface PhotoProps {
  id?: string
  uri: string
  isSynced: string
  isUploaded: string
  photo: any
  dispatch: any
}

const deviceWidth = Dimensions.get('window').width

function Photo(props: PhotoProps): JSX.Element {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uri, setUri] = useState(props.uri)
  const regEx = 'file:///'
  const icons = {
    'download'  : require('../../../assets/icons/photos/photo-remote.svg'),
    'upload'    : require('../../../assets/icons/photos/photo-local.svg')
  }
  const icon = props.isUploaded ? icons.download : icons.upload

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
            setIsDownloading(true)
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
          isDownloading ?
            <View style={[styles.iconBackground, styles.indicatorContainer]}>
              <MaterialIndicator color='white' size={15} trackWidth={2} />
            </View>
            :
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
    height: (deviceWidth - wp('6')) / 4,
    marginHorizontal: wp('0.1'),
    marginVertical: wp('0.5'),
    width: (deviceWidth - wp('6')) / 4
  },
  icon: {
    height: 22,
    width: 22
  },
  iconBackground: {
    alignItems: 'center',
    backgroundColor: '#4385F4',
    borderRadius: 30 / 2,
    height: 30,
    justifyContent: 'center',
    marginLeft: wp('1'),
    marginTop: wp('1'),
    position: 'absolute',
    width: 30
  },
  image: {
    borderRadius: 10,
    height: (deviceWidth - wp('6')) / 4,
    width: (deviceWidth - wp('6')) / 4
  },
  indicatorContainer: {
    position: 'absolute'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Photo);