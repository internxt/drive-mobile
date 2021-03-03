import React from 'react'
import { StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux';
import { fileActions, layoutActions, PhotoActions } from '../../redux/actions';
import { sortPhotoTypes, sortTypes } from '../../redux/constants';

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
    height: 'auto',
    justifyContent: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 10,
    paddingBottom: 30
  },
  sortOption: {
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    paddingTop: 25,
    paddingLeft: 40,
    color: 'black'
  },
  sortOptionSelected: {
    fontFamily: 'Averta-Semibold',
    fontSize: 18,
    color: '#0084ff',
    paddingTop: 25,
    paddingLeft: 40
  }
})