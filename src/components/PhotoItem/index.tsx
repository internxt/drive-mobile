import * as React from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import { connect, useDispatch, useSelector, useStore } from 'react-redux';
import { fileActions, layoutActions, PhotoActions } from '../../redux/actions';
import { IPhoto } from '../PhotoList';

export interface PhotoProps {
    photosState?: any
    layoutState?: any
    dispatch?: any
    item?: IPhoto
    isLoading?: boolean
    source?: any
}

async function handleLongPress(props: PhotoProps, isSelected: boolean) {
  if (isSelected) {
    props.dispatch(fileActions.deselectFile(props.item))
  } else {
    props.dispatch(fileActions.selectFile(props.item))
  }
}

function PhotoItem(props: PhotoProps) {
  const isSelectionMode = props.photosState.selectedItems.length > 0
  const isSelected = props.photosState.selectedItems.filter((x: any) => x.id === props.item?.id).length > 0

  const [progress, setProgress] = React.useState(0)
  const progressPct = progress > 0 ? progress / props.item?.size : 0
  const progressWidth = Dimensions.get('screen').width * progressPct

  const [uploadProgress, setUploadProgress] = React.useState(0)
  const uploadProgressWidth = Dimensions.get('screen').width * uploadProgress

  const [isLoading, setIsLoading] = React.useState(props.isLoading ? true : false)

  React.useEffect(() => {
    setUploadProgress(props.photosState.progress)
  }, [props.photosState.progress])

  return (
    <View>
      <TouchableWithoutFeedback
        onLongPress={() => { handleLongPress(props, isSelected) }}
        onPress={() => {
          setIsLoading(true)
          props.dispatch(PhotoActions.selectPhoto(props.item))
          props.dispatch(layoutActions.openSelectPhotoModal(props.item));
          /*handleClick(props, setProgress).finally(() => {
                        setProgress(0)
                        setIsLoading(false)
                    })*/
        }}>

        <View >
          <Image
            style={styles.bigIcon}
            source={{ uri: props.item?.preview }}
            resizeMode={'cover'}
          />
        </View>
      </TouchableWithoutFeedback>

    </View>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

const styles = StyleSheet.create({
  bigIcon: {
    width: 110,
    height: 110,
    marginTop: 9,
    marginLeft: 13,
    borderRadius: 7
  }
});

export default connect(mapStateToProps)(PhotoItem);