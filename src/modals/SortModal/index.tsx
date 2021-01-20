import React from 'react'
import { StyleSheet, Text, View } from 'react-native';
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { sortTypes } from '../../redux/constants';

function SortModal(props: any) {

  return <Modal
    position={'bottom'}
    isOpen={props.layoutState.showSortModal}
    style={{ height: 300, paddingTop: 10, borderRadius: 8 }}
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
        props.filesState.sortType === sortTypes.DATE_ADDED ||
          props.filesState.sortType === ''
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(
          fileActions.setSortFunction(sortTypes.DATE_ADDED)
        );
      }}>Date Added</Text>
    <Text
      style={
        props.filesState.sortType === sortTypes.SIZE_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(
          fileActions.setSortFunction(sortTypes.SIZE_ASC)
        );
      }}>Size</Text>
    <Text
      style={
        props.filesState.sortType === sortTypes.NAME_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(fileActions.setSortFunction(sortTypes.NAME_ASC));
      }}>Name</Text>
    <Text
      style={
        props.filesState.sortType === sortTypes.FILETYPE_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(
          fileActions.setSortFunction(sortTypes.FILETYPE_ASC)
        );
      }}>File Type</Text>
  </Modal>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SortModal)

const styles = StyleSheet.create({
  drawerKnob: {
    backgroundColor: '#d8d8d8',
    width: 56,
    height: 7,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 10
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