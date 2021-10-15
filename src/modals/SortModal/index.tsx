import React from 'react'
import { StyleSheet, Text } from 'react-native';
import Modal from 'react-native-modalbox'
import { connect } from 'react-redux';
import strings from '../../../assets/lang/strings';
import { fileActions, layoutActions } from '../../redux/actions';
import { sortTypes } from '../../redux/constants';

function SortModal(props: any) {

  return <Modal
    position={'bottom'}
    isOpen={props.layoutState.showSortModal}
    style={styles.modal}
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
        props.dispatch(fileActions.setSortFunction(sortTypes.DATE_ADDED))
      }}>{strings.components.app_menu.filter.date}</Text>
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
      }}>{strings.components.app_menu.filter.size}</Text>
    <Text
      style={
        props.filesState.sortType === sortTypes.NAME_ASC
          ? styles.sortOptionSelected
          : styles.sortOption
      }
      onPress={() => {
        props.dispatch(fileActions.setSortFunction(sortTypes.NAME_ASC));
      }}>{strings.components.app_menu.filter.name}</Text>
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
      }}>{strings.components.app_menu.filter.type}</Text>
  </Modal>
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SortModal)

const styles = StyleSheet.create({
  modal: { height: 300, paddingTop: 10, borderRadius: 8 },
  sortOption: {
    color: 'black',
    fontFamily: 'NeueEinstellung-SemiBold',
    fontSize: 18,
    paddingLeft: 40,
    paddingTop: 25
  },
  sortOptionSelected: {
    color: '#0084ff',
    fontFamily: 'NeueEinstellung-SemiBold',
    fontSize: 18,
    paddingLeft: 40,
    paddingTop: 25
  }
})