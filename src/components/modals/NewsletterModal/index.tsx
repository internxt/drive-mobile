import React from 'react';
import { Text, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { tailwind } from '../../../helpers/designSystem';
import { useAppSelector } from '../../../store/hooks';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import CenterModal from '../CenterModal';

const NewsletterModal = (props: { isOpen: boolean; onClosed: () => void }): JSX.Element => {
  const { user } = useAppSelector((state) => state.auth);
  const onCancelButtonPressed = () => {
    props.onClosed();
  };
  const onSubscribeButtonPressed = () => {
    props.onClosed();
  };

  return (
    <CenterModal isOpen={props.isOpen} onClosed={props.onClosed}>
      <View style={tailwind('p-3 pt-6 justify-center items-center')}>
        <Text style={tailwind('mb-4 font-semibold text-xl text-center text-neutral-500')}>
          {strings.modals.NewsletterModal.title}
        </Text>

        <Text style={tailwind('mb-5 px-6 text-center text-neutral-100')}>{strings.modals.NewsletterModal.message}</Text>

        <View style={tailwind('px-3 w-full')}>
          <AppTextInput
            containerStyle={tailwind('px-3 mb-9 items-center justify-center')}
            placeholder={strings.components.inputs.email}
            editable={false}
            value={user?.email}
          />
        </View>

        <View style={tailwind('flex-row')}>
          <AppButton
            type="cancel"
            title={strings.components.buttons.cancel}
            onPress={onCancelButtonPressed}
            style={tailwind('flex-1 mr-2')}
          ></AppButton>
          <AppButton
            type="accept"
            title={strings.components.buttons.subscribe}
            onPress={onSubscribeButtonPressed}
            style={tailwind('flex-1')}
          ></AppButton>
        </View>
      </View>
    </CenterModal>
  );
};

export default NewsletterModal;
