import React from 'react';
import { Text, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { newsletterThunks } from '../../../store/slices/newsletter';
import { BaseModalProps } from '../../../types/ui';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import CenterModal from '../CenterModal';

const NewsletterModal = (props: BaseModalProps): JSX.Element => {
  const tailwind = useTailwind();
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector((state) => state.newsletter.isSubscribing);
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onSubscribeButtonPressed = async () => {
    user && (await dispatch(newsletterThunks.subscribeThunk(user?.email)));
    props.onClose();
  };

  return (
    <CenterModal isOpen={props.isOpen} onClosed={props.onClose}>
      <View style={tailwind('p-3 pt-6 justify-center items-center')}>
        <Text style={tailwind('mb-4 font-semibold text-xl text-center text-neutral-500')}>
          {strings.modals.NewsletterModal.title}
        </Text>

        <Text style={tailwind('mb-5 px-6 text-center text-neutral-100')}>{strings.modals.NewsletterModal.message}</Text>

        <View style={tailwind('px-3 w-full')}>
          <AppTextInput
            containerStyle={tailwind('px-3 mb-9 items-center justify-center')}
            placeholder={strings.inputs.email}
            editable={false}
            value={user?.email}
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
            disabled={isLoading}
            type="accept"
            title={strings.buttons.subscribe}
            onPress={onSubscribeButtonPressed}
            style={tailwind('flex-1')}
          ></AppButton>
        </View>
      </View>
    </CenterModal>
  );
};

export default NewsletterModal;
