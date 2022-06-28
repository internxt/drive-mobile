import React, { useState } from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../AppText';
import { BaseModalProps } from '../../../types/ui';
import { useAppDispatch } from 'src/store/hooks';
import { authThunks } from 'src/store/slices/auth';

const DisableTwoFactorModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const onClosed = () => {
    props.onClose();
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onDisableButtonPressed = () => {
    setIsLoading(true);
    dispatch(authThunks.disableTwoFactorThunk())
      .unwrap()
      .then(() => props.onClose())
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  };

  return (
    <CenterModal
      isOpen={props.isOpen}
      onClosed={onClosed}
      backdropPressToClose={!isLoading}
      backButtonClose={!isLoading}
    >
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl mb-6')} medium>
          {strings.modals.DisableTwoFactor.title}
        </AppText>

        <View style={tailwind('mt-6 flex-row justify-between')}>
          <AppButton
            title={strings.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('px-1')}></View>

          <AppButton
            title={isLoading ? strings.buttons.disabling : strings.buttons.disable}
            type="accept"
            onPress={onDisableButtonPressed}
            loading={isLoading}
            disabled={isLoading}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
};

export default DisableTwoFactorModal;
