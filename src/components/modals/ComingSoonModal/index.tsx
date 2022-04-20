import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP } from 'react-native-responsive-screen';

import strings from '../../../../assets/lang/strings';
import { tailwind } from '../../../helpers/designSystem';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';

const ComingSoonModal = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { showComingSoonModal } = useAppSelector((state) => state.ui);

  return (
    <Modal
      isOpen={showComingSoonModal}
      onClosed={() => {
        dispatch(uiActions.setShowComingSoonModal(false));
      }}
      position="center"
      style={styles.modalContainer}
    >
      <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>

      <View style={styles.textContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{strings.modals.ComingSoonModal.title}</Text>
        </View>

        <Text style={styles.subtitle}>{strings.modals.ComingSoonModal.subtitle}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.blue]}
          onPress={() => {
            dispatch(uiActions.setShowComingSoonModal(false));
          }}
        >
          <Text style={[styles.text, styles.white]}>{strings.modals.ComingSoonModal.got_it}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blue: {
    backgroundColor: '#4585f5',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderRadius: 4,
    borderWidth: 2,
    height: 50,
    justifyContent: 'center',
    width: widthPercentageToDP('35'),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    width: '80%',
  },
  modalContainer: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  subtitle: {
    color: '#737880',
    fontSize: 17,
    marginTop: 15,
  },
  text: {
    color: '#5c6066',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16,
  },
  textContainer: {
    paddingHorizontal: 30,
  },
  title: {
    color: 'black',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 27,
  },
  titleContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  white: {
    color: '#fff',
  },
});

export default ComingSoonModal;
