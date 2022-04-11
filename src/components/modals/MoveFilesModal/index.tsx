import React from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

import strings from '../../../../assets/lang/strings';
import Separator from '../../Separator';
import { tailwind } from '../../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { driveThunks } from '../../../store/slices/drive';
import DriveItem from '../../DriveItemTable';
import { DriveItemStatus, DriveListType, DriveListViewMode } from '../../../types/drive';

function MoveFilesModal(): JSX.Element {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { showMoveModal } = useAppSelector((state) => state.ui);
  const { currentFolderId, selectedFile } = useAppSelector((state) => state.drive);

  const onMoveButtonPressed = async () => {
    const rootFolderId = user?.root_folder_id;

    if (selectedFile) {
      await dispatch(driveThunks.moveFileThunk({ fileId: selectedFile.fileId, destinationFolderId: currentFolderId }));
      dispatch(uiActions.setShowMoveModal(false));

      rootFolderId && dispatch(driveThunks.getFolderContentThunk({ folderId: rootFolderId }));
    }
  };
  const onCancelButtonPressed = () => {
    dispatch(uiActions.setShowMoveModal(false));
    dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
  };

  return (
    <Modal
      isOpen={showMoveModal}
      onClosed={() => {
        dispatch(uiActions.setShowMoveModal(false));
      }}
      position="center"
      style={tailwind('w-11/12 h-5/6 p-3 rounded-lg')}
    >
      <View style={styles.breadcrumbs}>
        <Text style={styles.title}>{strings.modals.MoveModal.title}</Text>
      </View>

      <Separator style={tailwind('my-3')} />

      <View style={tailwind('flex-grow')}>
        <FlatList
          data={[] as any[]}
          renderItem={(folder: any) => {
            return (
              <DriveItem
                key={folder.id}
                type={DriveListType.Drive}
                status={DriveItemStatus.Idle}
                viewMode={DriveListViewMode.List}
                data={folder.item}
                progress={-1}
              />
            );
          }}
          keyExtractor={(folder) => folder.id.toString()}
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onCancelButtonPressed}>
          <Text style={styles.text}>{strings.components.buttons.cancel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.blue]} onPress={onMoveButtonPressed}>
          <Text style={[styles.text, styles.white]}>{strings.components.buttons.move}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blue: {
    backgroundColor: '#4585f5',
  },
  breadcrumbs: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    marginTop: Platform.OS === 'ios' ? wp('14') : 0,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderRadius: 8,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: wp('40'),
  },
  text: {
    color: '#5c6066',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16,
  },
  title: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 21,
    letterSpacing: -0.2,
    margin: 20,
  },
  white: {
    color: '#fff',
  },
});

export default MoveFilesModal;
