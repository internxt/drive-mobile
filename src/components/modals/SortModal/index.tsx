import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Modal from 'react-native-modalbox';

import strings from '../../../../assets/lang/strings';
import { sortTypes } from '../../../services/file';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { filesActions } from '../../../store/slices/files';
import { layoutActions } from '../../../store/slices/layout';

function SortModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { sortType } = useAppSelector((state) => state.files);
  const { showSortModal } = useAppSelector((state) => state.layout);
  const onSortTypePressed = (sortType: string) => {
    dispatch(filesActions.setSortType(sortType));
    dispatch(layoutActions.setShowSortModal(false));
  };

  return (
    <Modal
      position={'bottom'}
      isOpen={showSortModal}
      style={styles.modal}
      backButtonClose={true}
      onClosed={() => {
        dispatch(layoutActions.setShowSortModal(false));
      }}
      animationDuration={200}
    >
      <Text
        style={sortType === sortTypes.DATE_ADDED || sortType === '' ? styles.sortOptionSelected : styles.sortOption}
        onPress={() => onSortTypePressed(sortTypes.DATE_ADDED)}
      >
        {strings.components.app_menu.filter.date}
      </Text>
      <Text
        style={sortType === sortTypes.SIZE_ASC ? styles.sortOptionSelected : styles.sortOption}
        onPress={() => onSortTypePressed(sortTypes.SIZE_ASC)}
      >
        {strings.components.app_menu.filter.size}
      </Text>
      <Text
        style={sortType === sortTypes.NAME_ASC ? styles.sortOptionSelected : styles.sortOption}
        onPress={() => onSortTypePressed(sortTypes.NAME_ASC)}
      >
        {strings.components.app_menu.filter.name}
      </Text>
      <Text
        style={sortType === sortTypes.FILETYPE_ASC ? styles.sortOptionSelected : styles.sortOption}
        onPress={() => onSortTypePressed(sortTypes.FILETYPE_ASC)}
      >
        {strings.components.app_menu.filter.type}
      </Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { height: 300, paddingTop: 10, borderRadius: 8 },
  sortOption: {
    color: 'black',
    fontFamily: 'NeueEinstellung-SemiBold',
    fontSize: 18,
    paddingLeft: 40,
    paddingTop: 25,
  },
  sortOptionSelected: {
    color: '#0084ff',
    fontFamily: 'NeueEinstellung-SemiBold',
    fontSize: 18,
    paddingLeft: 40,
    paddingTop: 25,
  },
});

export default SortModal;
