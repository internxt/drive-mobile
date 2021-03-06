import React from 'react'
import { StyleSheet, Text } from 'react-native';
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { sortPhotoTypes } from '../../redux/constants';

function SortModal(props: any) {

  return <Modal
    position={'bottom'}
    isOpen={props.layoutState.showSortPhotoModal}
    style={{ height: 300, paddingTop: 10, borderRadius: 8 }}
    backButtonClose={true}
    onClosed={() => {
      props.dispatch(layoutActions.closeSortPhotoModal())
    }}
    backdropPressToClose={true}
    swipeToClose={true}
    animationDuration={200}
  >

    <Text
      style={
        props.photosState.sortType === sortPhotoTypes.DATE_ADDED ||
          props.photosState.sortType === ''
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(
          fileActions.setSortFunction(sortPhotoTypes.DATE_ADDED)
        );
      }}>Date Added</Text>
    <Text
      style={
        props.photosState.sortType === sortPhotoTypes.SIZE_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(
          fileActions.setSortFunction(sortPhotoTypes.SIZE_ASC)
        );
      }}>Size</Text>
    <Text
      style={
        props.photosState.sortType === sortPhotoTypes.NAME_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(fileActions.setSortFunction(sortPhotoTypes.NAME_ASC));
      }}>Name</Text>
    <Text
      style={
        props.photosState.sortType === sortPhotoTypes.FILETYPE_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(
          fileActions.setSortFunction(sortPhotoTypes.FILETYPE_ASC)
        );
      }}>File Type</Text>
  </Modal>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SortModal)

const styles = StyleSheet.create({
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