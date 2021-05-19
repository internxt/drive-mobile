import React, { useState } from 'react'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { StyleSheet, Image, ActivityIndicator, View, Platform } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import PhotoBadge from './PhotoBadge';
import { cachePicture, downloadPhoto, IHashedPhoto } from '../../screens/PhotoGallery/init';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleToast from 'react-native-simple-toast';
import { tailwind } from '../../tailwind'
import { DEVICE_WIDTH } from '../../screens/PhotoGallery';
import { unlink } from 'react-native-fs';

interface PhotoProps {
  badge?: JSX.Element
  item: IHashedPhoto
  pushDownloadedPhoto?: (downloadedPhoto: IHashedPhoto) => void
  photoSelection?: boolean
}

export default function Photo(props: PhotoProps): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isSelected, setIsSelected] = useState(false)
  const item = props.item
  const [path, setPath] = useState(props.item.localUri)

  const handleOnPress = () => {
    if (props.photoSelection) {
      return setIsSelected(prevState => !prevState)
    }

    if (!item.localUri) {
      return;
    }

    if (item.isUploaded && !item.isLocal && !isDownloading) {
      setIsDownloading(true)
      downloadPhoto(item, setProgress).then((path) => {
        /* if (props.pushDownloadedPhoto) {
          props.pushDownloadedPhoto(asset)
        } */
        setPath(path)
        item.isLocal = true
        SimpleToast.show('Image downloaded!', 0.15)
      }).catch(err => {
        SimpleToast.show('Could not download image', 0.15)
      }).finally(() => setIsDownloading(false))
    } else {
      let filename = ''
      let localUri = ''

      if (item.filename) {
        filename = item.filename
        localUri = item.localUri
      }
      else {
        filename = item.photoId + '.' + item.type
        localUri = path
      }

      cachePicture(filename, localUri).then(path => {
        FileViewer.open(path, {
          onDismiss: () => unlink(path)
        })
      }).catch((err) => {
        SimpleToast.show('Could not open the image', 0.15)
      })
    }
  }

  try {
    const urlEncoded = item.localUri.startsWith('file://')

    if (Platform.OS === 'android' && props.item.isUploaded && !urlEncoded) {
      props.item.localUri = 'file://' + props.item.localUri;
    }
  } catch { }

  return (
    <TouchableOpacity
      onPress={() => handleOnPress()}
      disabled={isDownloading}
    >
      <View style={{ width: (DEVICE_WIDTH - 40) / 3, height: (DEVICE_WIDTH - 80) / 3 }}>
        <View style={tailwind('m-0.5')}>
          <Image
            onLoadEnd={() => setIsLoaded(true)}
            style={tailwind('self-center rounded-md w-full h-full')}
            resizeMode='cover'
            source={{ uri: item.localUri }}
          />
        </View>

        {!isLoaded ?
          <ActivityIndicator color='gray' size='small' style={tailwind('absolute')} />
          :
          props.badge ||
          <PhotoBadge
            isUploaded={item.isUploaded}
            isLocal={item.isLocal}
            isDownloading={isDownloading}
            isUploading={item.isUploading}
            isSelected={isSelected}
          />
        }

        <View style={tailwind('absolute bottom-0 self-center w-11/12 mb-4 pl-1')}>
          {
            true ?
              <LinearGradient
                colors={['#47c7fd', '#096dff']}
                start={[0, 0.7]}
                end={[0.7, 1]}
                style={[styles.progressIndicator, { width: (DEVICE_WIDTH / 3.5 - 40) * progress }]} />
              :
              null
          }
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  progressIndicator: {
    backgroundColor: '#87B7FF',
    borderRadius: 3,
    height: 6
  }
});