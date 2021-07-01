import React, { useState } from 'react'
import { StyleSheet, ActivityIndicator, View, Platform, TouchableOpacity, Dimensions, Image } from 'react-native';
import FileViewer from 'react-native-file-viewer';
import PhotoBadge from './PhotoBadge';
import { LinearGradient } from 'expo-linear-gradient';
import SimpleToast from 'react-native-simple-toast';
import { tailwind } from '../../tailwind'
import { unlink } from 'react-native-fs';
import { photoActions } from '../../redux/actions';
import { IPhotoToRender, ISelectedPhoto } from '../../library/interfaces/photos';
import { downloadPhoto } from '../../library/apis/photoGallery';
import { cachePicture } from '../../library/services/photoGallery';
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
  const DEVICE_WIDTH = Dimensions.get('window').width

  const handleOnPress = () => {
    if (photoSelection) {
      const photoObj = { hash: item.hash, photoId: item.photoId }

      handleSelection(photoObj)
      dispatch(photoActions.updatePhotoStatusSelection(item.hash))
      return
    }
    if (!item.localUri) {
      return
    }

    if (item.isUploaded && !item.isLocal && !item.isDownloading) {
      dispatch(photoActions.updatePhotoStatusDownload(item.hash, false))
      let error = false

      downloadPhoto(item, setProgress, dispatch).then(() => {
        SimpleToast.show('Image downloaded!', 0.15)
      }).catch(err => {
        error = true
        SimpleToast.show('Could not download image', 0.15)
      }).finally(() => {
        setProgress(0)
        dispatch(photoActions.updatePhotoStatusDownload(item.hash, true))
        if (!error) { dispatch(photoActions.updatePhotoStatus(item.hash, true, true)) }
      })
    } else {
      const filename = item.filename ? item.filename : item.photoId + '.' + item.type

      cachePicture(filename, item.localUri).then(path => {
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
          <View style={item.isUploading || item.isDownloading ? tailwind('absolute bg-gray-70 bg-opacity-50 w-full h-full rounded-md z-10') : ''} />
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