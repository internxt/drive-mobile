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
import CodeInput from 'src/components/CodeInput';

const DisableTwoFactorModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [isAuthCodeValid, setIsAuthCodeValid] = useState(false);
  const authCodeLength = 6;
  const onClosed = () => {
    props.onClose();
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const onCodeInputChanged = (value: string) => {
    setAuthCode(value);
    setIsAuthCodeValid(value.length === authCodeLength);
  };
  const onDisableButtonPressed = () => {
    setIsLoading(true);
    dispatch(authThunks.disableTwoFactorThunk({ code: authCode }))
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
        <AppText style={tailwind('text-xl mb-1.5')} medium>
          {strings.modals.DisableTwoFactor.title}
        </AppText>

        <AppText style={tailwind('text-gray-60 text-sm mb-6')} medium>
          {strings.modals.EnableTwoFactor.enterCode}
        </AppText>

        <CodeInput
          value={authCode}
          onChange={onCodeInputChanged}
          label={strings.inputs.twoFactorAuth}
          length={authCodeLength}
        />

        <View style={tailwind('mt-6 flex-row justify-between')}>
          <AppButton
            title={strings.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
            disabled={isLoading}
            style={tailwind('flex-1 mr-2')}
          />

          <AppButton
            title={isLoading ? strings.buttons.disabling : strings.buttons.disable}
            type="accept"
            onPress={onDisableButtonPressed}
            loading={isLoading}
            disabled={isLoading || !isAuthCodeValid}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </CenterModal>
  );
};

export default DisableTwoFactorModal;
