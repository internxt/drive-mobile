import React, { useState } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { StyleSheet, Image, Dimensions, ActivityIndicator, View, Platform } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import PhotoBadge from './PhotoBadge';
import { cachePicture, downloadPhoto, getRecentlyDownloadedImage, IHashedPhoto } from '../../screens/Photos/init';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleToast from 'react-native-simple-toast';
import RNFS from 'react-native-fs'
import { Previews } from '../../database/models/previews';

const deviceWidth = Dimensions.get('window').width

interface PhotoProps {
  badge?: JSX.Element
  item: any
  updateDownloadedImageStatus: (remotePreview: Previews, downloadedPhoto: IHashedPhoto) => void
}

export default function Photo(props: PhotoProps): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const item = props.item
  const [itemPath, setItemPath] = useState(props.item.localUri)
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  try {
    const urlEncoded = props.item.localUri.startsWith('file://')

    if (Platform.OS === 'android' && props.item.isUploaded && !urlEncoded) {
      props.item.localUri = 'file://' + props.item.localUri;
    }
  } catch { }

  return (
    <TouchableOpacity
      style={styles.imageView}
      onPress={() => {
        if (!item.localUri) {
          return;
        }

        if (props.item.isUploaded && !props.item.isLocal && !isDownloading) {
          setIsDownloading(true)
          downloadPhoto(item, setProgress).then(path => {
            getRecentlyDownloadedImage().then(photos => {
              const downloadedPhoto = photos[0]

              props.updateDownloadedImageStatus(item, downloadedPhoto)
              setItemPath(path)
            })
          }).catch(() => SimpleToast.show('Could not download image'))
            .finally(() => {
              setIsDownloading(false)
              SimpleToast.show('Image downloaded!', 0.15)
            })
        } else {
          if (itemPath) {
            cachePicture(item).then(res => {
              FileViewer.open(res, {
                onDismiss: () => RNFS.unlink(res)
              })
            })
          }
        }
      }}
      disabled={isDownloading}
    >
      <Image
        onLoadEnd={() => setIsLoaded(true)}
        style={!isDownloading ? styles.image : [styles.image, styles.disabled]}
        source={{ uri: item.localUri }}
      />

      {!isLoaded || isDownloading
        ? <ActivityIndicator color='gray' size='small' style={styles.badge} />
        : <View style={styles.badge}>
          {props.badge ||
            <PhotoBadge
              isUploaded={props.item.isUploaded}
              isLocal={props.item.isLocal} />
          }
        </View>
      }

      <View style={styles.progressIndicatorContainer}>
        {
          isDownloading ?
            <LinearGradient
              colors={['#47c7fd', '#096dff']}
              start={[0, 0.7]}
              end={[0.7, 1]}
              style={[styles.progressIndicator, { width: (deviceWidth / 3.5) * progress }]} />
            :
            null
        }
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute'
  },
  disabled: {
    opacity: 0.5
  },
  image: {
    borderRadius: 10,
    height: (deviceWidth - wp('3.5')) / 3,
    width: (deviceWidth - wp('3.5')) / 3
  },
  imageView: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginHorizontal: wp('0.5'),
    marginVertical: wp('0.5')
  },
  progressIndicator: {
    backgroundColor: '#87B7FF',
    borderRadius: 3,
    height: 6
  },
  progressIndicatorContainer: {
    alignSelf: 'center',
    bottom: 0,
    height: 17,
    position: 'absolute',
    width: '90%'
  }
});