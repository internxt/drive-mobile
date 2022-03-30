import React from 'react';
import { View, Text, StyleSheet, Linking, Alert } from 'react-native';
import Modal from 'react-native-modalbox';
import { useNavigation } from '@react-navigation/native';

import SettingsItem from './SettingsItem';
import Separator from '../../Separator';
import strings from '../../../../assets/lang/strings';
import { tailwind } from '../../../helpers/designSystem';
import { AppScreenKey } from '../../../types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import { authThunks } from '../../../store/slices/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

function SettingsModal(): JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const showSettingsModal = useAppSelector((state) => state.ui.showSettingsModal);

  return (
    <Modal
      isOpen={showSettingsModal}
      position={'bottom'}
      style={styles.modalSettings}
      onClosed={() => dispatch(uiActions.setShowSettingsModal(false))}
      backButtonClose={true}
      animationDuration={200}
      coverScreen={true}
    >
      <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>

      <Text style={styles.nameText}>
        {user?.name} {user?.lastname}
      </Text>

      <Separator style={tailwind('my-3')} />

      <SettingsItem
        text={strings.components.app_menu.settings.storage}
        onPress={() => {
          dispatch(uiActions.setShowSettingsModal(false));
          navigation.replace(AppScreenKey.Storage);
        }}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.more}
        onPress={() => Linking.openURL('https://internxt.com/drive')}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.contact}
        onPress={() => {
          const contact = 'https://help.internxt.com/';

          Linking.canOpenURL(contact)
            .then(() => {
              Linking.openURL(contact);
            })
            .catch(() => {
              Alert.alert('Info', 'To contact with us please go to https://help.internxt.com/');
            });
        }}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.signOut}
        onPress={() => {
          dispatch(uiActions.setShowSettingsModal(false));
          dispatch(authThunks.signOutThunk());
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalSettings: {
    borderWidth: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: 350,
  },
  nameText: {
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 26,
    marginTop: 10,
  },
});

export default SettingsModal;
