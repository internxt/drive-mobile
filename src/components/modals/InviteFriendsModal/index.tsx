import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { usersThunks } from '../../../store/slices/users';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import CenterModal from '../CenterModal';

const InviteFriendsModal = (props: BaseModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const [email, setEmail] = useState('');
  const dispatch = useAppDispatch();
  const isSendingInvitation = useAppSelector((state) => state.users.isSendingInvitation);
  const onEmailInputChanged = (value: string) => {
    setEmail(value);
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onInviteButtonPressed = async () => {
    await dispatch(usersThunks.inviteAFriendThunk(email));
    props.onClose();
  };

  useEffect(() => {
    if (props.isOpen) {
      setEmail('');
    }
  }, [props.isOpen]);

  return (
    <CenterModal
      isOpen={props.isOpen}
      onClosed={props.onClose}
      backButtonClose={!isSendingInvitation}
      backdropPressToClose={!isSendingInvitation}
    >
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl')} medium>
          {strings.modals.InviteFriendsModal.title}
        </AppText>

        <AppTextInput
          containerStyle={tailwind('my-6')}
          label={strings.inputs.email}
          autoCapitalize="none"
          autoFocus
          value={email}
          onChangeText={onEmailInputChanged}
        />

        <View style={tailwind('flex-row')}>
          <AppButton
            type="cancel"
            title={strings.buttons.cancel}
            onPress={onCancelButtonPressed}
            style={tailwind('flex-1 mr-2')}
            disabled={isSendingInvitation}
          ></AppButton>
          <AppButton
            disabled={!email || isSendingInvitation}
            loading={isSendingInvitation}
            type="accept"
            title={isSendingInvitation ? strings.buttons.sending : strings.buttons.invite}
            onPress={onInviteButtonPressed}
            style={tailwind('flex-1')}
          ></AppButton>
        </View>
      </View>
    </CenterModal>
  );
};

export default InviteFriendsModal;
