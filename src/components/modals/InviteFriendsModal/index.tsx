import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { usersThunks } from '../../../store/slices/users';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import CenterModal from '../CenterModal';

const InviteFriendsModal = (props: { isOpen: boolean; onClosed: () => void }): JSX.Element => {
  const tailwind = useTailwind();
  const [email, setEmail] = useState('');
  const dispatch = useAppDispatch();
  const isSendingInvitation = useAppSelector((state) => state.users.isSendingInvitation);
  const onEmailInputChanged = (value: string) => {
    setEmail(value);
  };
  const onCancelButtonPressed = () => {
    props.onClosed();
  };
  const onInviteButtonPressed = async () => {
    await dispatch(usersThunks.inviteAFriendThunk(email));
    props.onClosed();
  };

  return (
    <CenterModal isOpen={props.isOpen} onClosed={props.onClosed}>
      <View style={tailwind('p-3 pt-6 justify-center items-center')}>
        <Text style={tailwind('mb-4 font-semibold text-xl text-center text-neutral-500')}>
          {strings.modals.InviteFriendsModal.title}
        </Text>

        <Text style={tailwind('mb-5 px-6 text-center text-neutral-100')}>
          {strings.modals.InviteFriendsModal.message}
        </Text>

        <View style={tailwind('px-3 w-full')}>
          <AppTextInput
            containerStyle={tailwind('px-3 mb-9')}
            placeholder={strings.inputs.email}
            autoCapitalize="none"
            value={email}
            onChangeText={onEmailInputChanged}
          />
        </View>

        <View style={tailwind('flex-row')}>
          <AppButton
            type="cancel"
            title={strings.buttons.cancel}
            onPress={onCancelButtonPressed}
            style={tailwind('flex-1 mr-2')}
          ></AppButton>
          <AppButton
            disabled={!email || isSendingInvitation}
            type="accept"
            title={strings.buttons.invite}
            onPress={onInviteButtonPressed}
            style={tailwind('flex-1')}
          ></AppButton>
        </View>
      </View>
    </CenterModal>
  );
};

export default InviteFriendsModal;
