import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import CenterModal from '../CenterModal';
import AppButton from '../../AppButton';
import { useTailwind } from 'tailwind-rn';
import AppText from '../../AppText';
import { BaseModalProps } from '../../../types/ui';
import { authThunks } from 'src/store/slices/auth';
import { useAppDispatch } from 'src/store/hooks';
import CopyableText from 'src/components/CopyableText';
import { TwoFactorAuthQR } from '@internxt/sdk';
import CodeInput from 'src/components/CodeInput';

const EnableTwoFactorModal = (props: BaseModalProps) => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [qrData, setQrData] = useState<TwoFactorAuthQR>();
  const [authCode, setAuthCode] = useState('');
  const [isAuthCodeValid, setIsAuthCodeValid] = useState(false);
  const authCodeLength = 6;
  const onClosed = () => {
    props.onClose();
  };
  const onCancelButtonPressed = () => {
    props.onClose();
  };
  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };
  const onContinueButtonPressed = () => {
    goToNextStep();
  };
  const onCodeInputChanged = (value: string) => {
    setAuthCode(value);
    setIsAuthCodeValid(value.length === authCodeLength);
  };
  const onEnableButtonPressed = () => {
    setIsLoading(true);
    dispatch(authThunks.enableTwoFactorThunk({ backupKey: qrData?.backupKey as string, code: authCode }))
      .unwrap()
      .then(() => {
        onClosed();
      })
      .catch(() => undefined)
      .finally(() => {
        setIsLoading(false);
      });
  };
  const reset = () => {
    setCurrentStep(0);
    setQrData(undefined);
    setAuthCode('');
    setIsAuthCodeValid(false);
  };
  const generateNew2FA = () => {
    setIsLoading(true);
    dispatch(authThunks.generateNewTwoFactorThunk())
      .unwrap()
      .then((response) => {
        setQrData(response);
      })
      .catch(() => undefined)
      .finally(() => {
        setIsLoading(false);
      });
  };
  const renderQrStep = () => (
    <>
      <AppText style={tailwind('text-gray-60 text-sm mb-6')} medium>
        {strings.modals.EnableTwoFactor.advice}
      </AppText>

      <View style={tailwind('items-center mb-6')}>
        {isLoading || !qrData ? (
          <View style={tailwind('bg-gray-5 w-40 h-40')} />
        ) : (
          <Image source={{ uri: qrData.qr }} style={tailwind('bg-gray-5 w-40 h-40')} />
        )}
      </View>

      {!isLoading && qrData && <CopyableText>{qrData.backupKey}</CopyableText>}

      <View style={tailwind('mt-6 flex-row justify-between')}>
        <AppButton
          title={strings.buttons.cancel}
          type="cancel"
          onPress={onCancelButtonPressed}
          disabled={isLoading}
          style={tailwind('flex-1 mr-1.5')}
        />

        <AppButton
          title={strings.buttons.continue}
          type="accept"
          onPress={onContinueButtonPressed}
          disabled={isLoading}
          style={tailwind('flex-1')}
        />
      </View>
    </>
  );
  const renderAuthCodeStep = () => (
    <>
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
          style={tailwind('flex-1 mr-1.5')}
        />

        <AppButton
          title={isLoading ? strings.buttons.enabling : strings.buttons.enable}
          type="accept"
          onPress={onEnableButtonPressed}
          disabled={isLoading || !isAuthCodeValid}
          style={tailwind('flex-1')}
        />
      </View>
    </>
  );
  const steps = [
    {
      key: 'qr',
      render: renderQrStep,
    },
    {
      key: 'auth-code',
      render: renderAuthCodeStep,
    },
  ];

  useEffect(() => {
    if (props.isOpen) {
      reset();
      generateNew2FA();
    }
  }, [props.isOpen]);

  return (
    <CenterModal
      isOpen={props.isOpen}
      onClosed={onClosed}
      backdropPressToClose={!isLoading}
      backButtonClose={!isLoading}
    >
      <View style={tailwind('p-4')}>
        <AppText style={tailwind('text-xl mb-1.5')} medium>
          {strings.modals.EnableTwoFactor.title}
        </AppText>

        {steps[currentStep].render()}
      </View>
    </CenterModal>
  );
};

export default EnableTwoFactorModal;
