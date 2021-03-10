import React from 'react'
import { StyleSheet, Text } from 'react-native';
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux';
import { layoutActions, PhotoActions } from '../../redux/actions';
import { sortPhotoTypes } from '../../redux/constants';

function SortModalPhotos(props: any) {

  return (
    <Modal
      position={'bottom'}
      isOpen={props.layoutState.showSortModal}
      style={styles.modalContainer}
      backButtonClose={true}
      onClosed={() => {
        props.dispatch(layoutActions.closeSortModal())
      }}
      backdropPressToClose={true}
      swipeToClose={true}
      animationDuration={200}
    >
      <Text
        style={
          props.photosState.sortType === sortPhotoTypes.ALL_PHOTOS
            ? styles.sortOptionSelected
            : styles.sortOption
        }
        onPress={() => {
          props.dispatch(PhotoActions.setSortFunction(sortPhotoTypes.ALL_PHOTOS));
        }}>All photos</Text>
      <Text
        style={
          props.photosState.sortType === sortPhotoTypes.SYNCED
            ? styles.sortOptionSelected
            : styles.sortOption
        }
        onPress={() => {
          props.dispatch(PhotoActions.setSortFunction(sortPhotoTypes.SYNCED));
        }}>Synced photos</Text>
      <Text
        style={
          props.photosState.sortType === sortPhotoTypes.UPLOAD_ONLY
            ? styles.sortOptionSelected
            : styles.sortOption
        }
        onPress={() => {
          props.dispatch(PhotoActions.setSortFunction(sortPhotoTypes.UPLOAD_ONLY));
        }}>Upload-pending photos</Text>
      <Text
        style={
          props.photosState.sortType === sortPhotoTypes.CLOUD_ONLY
            ? styles.sortOptionSelected
            : styles.sortOption
        }
        onPress={() => {
          props.dispatch(PhotoActions.setSortFunction(sortPhotoTypes.CLOUD_ONLY));
        }}>Cloud-only photos</Text>
    </Modal>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SortModalPhotos)

const styles = StyleSheet.create({
  modalContainer: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 'auto',
    justifyContent: 'center',
    paddingBottom: 30,
    paddingTop: 10
  },
  sortOption: {
    color: 'black',
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    paddingLeft: 40,
    paddingTop: 25
  },
  sortOptionSelected: {
    color: '#0084ff',
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    paddingLeft: 40,
    paddingTop: 25
  }
})