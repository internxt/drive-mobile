import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
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
    <CenterModal
      isOpen={props.isOpen}
      onClosed={props.onClose}
      backButtonClose={!isLoading}
      backdropPressToClose={!isLoading}
    >
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl mb-1.5')} medium>
          {strings.modals.NewsletterModal.title}
        </AppText>

        <AppText style={tailwind('mb-6 text-sm text-gray-60')}>{strings.modals.NewsletterModal.message}</AppText>

        <AppTextInput
          label={`${strings.inputs.email} (${strings.generic.notEditable.toLowerCase()})`}
          containerStyle={tailwind('mb-6')}
          placeholder={strings.inputs.email}
          editable={false}
          value={user?.email}
        />

        <View style={tailwind('flex-row')}>
          <AppButton
            type="cancel"
            title={strings.buttons.cancel}
            onPress={onCancelButtonPressed}
            style={tailwind('flex-1 mr-2')}
            disabled={isLoading}
          ></AppButton>
          <AppButton
            disabled={isLoading}
            loading={isLoading}
            type="accept"
            title={isLoading ? strings.buttons.subscribing : strings.buttons.subscribe}
            onPress={onSubscribeButtonPressed}
            style={tailwind('flex-1')}
          ></AppButton>
        </View>
      </View>
    </CenterModal>
  );
};

export default NewsletterModal;
