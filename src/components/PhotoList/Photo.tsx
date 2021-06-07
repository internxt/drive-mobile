import React, { useState } from 'react'
import { StyleSheet, ActivityIndicator, View, Platform, TouchableOpacity } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import PhotoBadge from './PhotoBadge';
import { cachePicture, downloadPhoto } from '../../screens/PhotoGallery/init';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleToast from 'react-native-simple-toast';
import { tailwind } from '../../tailwind'
import { DEVICE_WIDTH, IPhotoToRender } from '../../screens/PhotoGallery';
import { unlink } from 'react-native-fs';
import { photoActions } from '../../redux/actions';
import FastImage from 'react-native-fast-image'
import { ISelectedPhoto } from '../../modals/CreateAlbumModal/SelectPhotosModal';

interface PhotoProps {
  badge?: JSX.Element
  item: IPhotoToRender
  dispatch?: any
  photoSelection?: boolean
  handleSelection?: (selectedItem: ISelectedPhoto) => void
}

const Photo = ({ badge, item, dispatch, photoSelection, handleSelection }: PhotoProps): JSX.Element => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0)

  const handleOnPress = () => {
    if (photoSelection) {
      const photoObj = { hash: item.hash, photoId: item.photoId }

      handleSelection(photoObj)
      return dispatch(photoActions.updatePhotoStatusSelection(item.hash))
    }

    if (!item.localUri) { return }

    if (item.isUploaded && !item.isLocal && !item.isDownloading) {
      dispatch(photoActions.updatePhotoStatusDownload(item.hash, false))
      let error = false

      downloadPhoto(item, setProgress).then((path) => {
        item.localUri = path
        SimpleToast.show('Image downloaded!', 0.15)
      }).catch(err => {
        error = true
        SimpleToast.show('Could not download image', 0.15)
      }).finally(() => {
        dispatch(photoActions.updatePhotoStatusDownload(item.hash, true))
        if (!error) { dispatch(photoActions.updatePhotoStatus(item.hash, true, true)) }
      })
    } else {
      let filename = ''
      let localUri = ''

      if (item.filename) {
        filename = item.filename
        localUri = item.localUri
      } else {
        filename = item.photoId + '.' + item.type
        localUri = item.localUri
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

    if (Platform.OS === 'android' && item.isUploaded && !urlEncoded) {
      item.localUri = 'file://' + item.localUri;
    }
  } catch { }

  return (
    <TouchableOpacity
      onPress={() => handleOnPress()}
      disabled={item.isDownloading}
    >
      <View style={{ width: (DEVICE_WIDTH - 40) / 3, height: (DEVICE_WIDTH - 80) / 3 }}>
        <View style={tailwind('m-0.5')}>
          <FastImage
            onLoadEnd={() => setIsLoaded(true)}
            style={tailwind('self-center rounded-md w-full h-full')}
            resizeMode='cover'
            source={{ uri: item.localUri }}
          />
        </View>

        {!isLoaded ?
          <ActivityIndicator color='gray' size='small' style={tailwind('absolute')} />
          :
          badge ||
          <PhotoBadge
            isUploaded={item.isUploaded}
            isLocal={item.isLocal}
            isDownloading={item.isDownloading}
            isUploading={item.isUploading}
            isSelected={item.isSelected}
            photoSelection={photoSelection}
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

export default React.memo(Photo)