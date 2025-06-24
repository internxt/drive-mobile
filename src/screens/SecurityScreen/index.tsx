import Portal from '@burstware/react-native-portal';
import asyncStorageService from '@internxt-mobile/services/AsyncStorageService';
import { biometrics } from '@internxt-mobile/services/common';
import { CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import AppSwitch from 'src/components/AppSwitch';
import DisableTwoFactorModal from 'src/components/modals/DisableTwoFactorModal';
import EnableTwoFactorModal from 'src/components/modals/EnableTwoFactorModal';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { appActions } from 'src/store/slices/app';
import { authSelectors } from 'src/store/slices/auth';
import { uiActions } from 'src/store/slices/ui';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import SettingsGroup from '../../components/SettingsGroup';
import useGetColor from '../../hooks/useColor';
import { SettingsScreenProps } from '../../types/navigation';

const SecurityScreen = ({ navigation }: SettingsScreenProps<'Security'>) => {
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const { isEnableTwoFactorModalOpen, isDisableTwoFactorModalOpen } = useAppSelector((state) => state.ui);

  const { deviceHasBiometricAccess, biometricAccessType, screenLockEnabled } = useAppSelector((state) => state.app);

  const is2FAEnabled = useAppSelector(authSelectors.is2FAEnabled);
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const getColor = useGetColor();

  const onBackButtonPressed = () => {
    navigation.goBack();
  };

  const onChangePasswordPressed = () => {
    setIsChangePasswordModalOpen(true);
  };

  const onChangePasswordModalClosed = () => {
    setIsChangePasswordModalOpen(false);
  };

  const onEnableTwoFactorModalClosed = () => dispatch(uiActions.setIsEnableTwoFactorModalOpen(false));
  const onDisableTwoFactorModalClosed = () => dispatch(uiActions.setIsDisableTwoFactorModalOpen(false));

  const onEnableTwoFactorPressed = () => {
    dispatch(uiActions.setIsEnableTwoFactorModalOpen(true));
  };

  const onDisableTwoFactorPressed = () => {
    dispatch(uiActions.setIsDisableTwoFactorModalOpen(true));
  };

  const handleToggleScreenLockEnabled = async (screenLockEnabled: boolean) => {
    if (screenLockEnabled) {
      const authenticated = await biometrics.authenticate();
      if (authenticated) {
        await asyncStorageService.saveScreenLockIsEnabled(screenLockEnabled);
        await asyncStorageService.saveLastScreenUnlock(new Date());
        dispatch(appActions.setScreenLockIsEnabled(screenLockEnabled));
      }
    } else {
      await asyncStorageService.saveScreenLockIsEnabled(screenLockEnabled);
      dispatch(appActions.setScreenLockIsEnabled(screenLockEnabled));
    }
  };

  /*
   * READ - BACKUP KEY FEATURE
   * Planned to be released during the account feature
   * due to timings, this feature is expected to be implemented
   * in future iterations
   *
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onBackupKeyPressed = () => undefined;

  return (
    <>
      <Portal>
        <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={onChangePasswordModalClosed} />
        <EnableTwoFactorModal isOpen={isEnableTwoFactorModalOpen} onClose={onEnableTwoFactorModalClosed} />
        <DisableTwoFactorModal isOpen={isDisableTwoFactorModalOpen} onClose={onDisableTwoFactorModalClosed} />
      </Portal>

      <AppScreen
        safeAreaTop
        safeAreaBottom
        safeAreaColor={getColor('bg-surface')}
        style={[tailwind('flex-1'), { backgroundColor: getColor('bg-gray-5') }]}
      >
        <AppScreenTitle
          text={strings.screens.SecurityScreen.title}
          containerStyle={{ backgroundColor: getColor('bg-surface') }}
          centerText
          onBackButtonPressed={onBackButtonPressed}
        />
        <ScrollView style={{ height: '100%' }} contentContainerStyle={tailwind('pb-10')}>
          <View style={[tailwind('px-4 pt-8'), { backgroundColor: getColor('bg-gray-5') }]}>
            {/* SCREEN LOCK */}
            {deviceHasBiometricAccess && biometricAccessType ? (
              <SettingsGroup
                title={strings.screens.SecurityScreen.screenLock.title}
                items={[
                  {
                    key: 'screen-lock-text',
                    template: (
                      <View style={tailwind('p-4 flex flex-row')}>
                        <View style={tailwind('flex-1')}>
                          <AppText style={[tailwind('text-lg'), { color: getColor('text-gray-100') }]}>
                            {strings.screens.SecurityScreen.screenLock.subtitle[biometricAccessType]}
                          </AppText>
                          <AppText
                            style={[
                              tailwind('text-xs'),
                              {
                                color: getColor('text-gray-60'),
                                lineHeight: getLineHeight(12, 1.2),
                              },
                            ]}
                          >
                            {strings.screens.SecurityScreen.screenLock.message[biometricAccessType]}
                          </AppText>
                        </View>
                        <View style={tailwind('flex justify-center')}>
                          <AppSwitch onValueChange={handleToggleScreenLockEnabled} value={screenLockEnabled} />
                        </View>
                      </View>
                    ),
                  },
                ]}
              />
            ) : null}
            {/* CHANGE PASSWORD */}
            {/* TEMPORARILY HIDDEN */}
            {/* <SettingsGroup
              title={strings.screens.SecurityScreen.changePassword.title}
              items={[
                {
                  key: 'change-password-text',
                  template: (
                    <View style={tailwind('p-4')}>
                      <AppText>{strings.screens.SecurityScreen.changePassword.text}</AppText>
                    </View>
                  ),
                },
                {
                  key: 'change-password-action',
                  template: (
                    <View style={tailwind('flex-row items-center justify-between px-4 py-3')}>
                      <AppText style={tailwind('text-lg text-primary')}>
                        {strings.screens.SecurityScreen.changePassword.title}
                      </AppText>
                      <CaretRight size={20} color={getColor('text-primary')} />
                    </View>
                  ),
                  onPress: onChangePasswordPressed,
                },
              ]}
            /> */}

            {/* TWO FACTOR */}
            <SettingsGroup
              title={strings.screens.SecurityScreen.twoFactor.title}
              items={[
                {
                  key: 'two-factor-text',
                  template: (
                    <View style={tailwind('p-4')}>
                      <AppText style={{ color: getColor('text-gray-100') }}>
                        {strings.screens.SecurityScreen.twoFactor.text}
                      </AppText>
                    </View>
                  ),
                },
                {
                  key: 'two-factor-action',
                  template: (
                    <View style={tailwind('flex-row items-center justify-between px-4 py-3')}>
                      {is2FAEnabled ? (
                        <>
                          <AppText style={[tailwind('text-lg'), { color: getColor('text-red') }]}>
                            {strings.screens.SecurityScreen.twoFactor.disable}
                          </AppText>
                          <CaretRight size={20} color={getColor('text-red')} />
                        </>
                      ) : (
                        <>
                          <AppText style={[tailwind('text-lg'), { color: getColor('text-primary') }]}>
                            {strings.screens.SecurityScreen.twoFactor.enable}
                          </AppText>
                          <CaretRight size={20} color={getColor('text-primary')} />
                        </>
                      )}
                    </View>
                  ),
                  onPress: is2FAEnabled ? onDisableTwoFactorPressed : onEnableTwoFactorPressed,
                },
              ]}
            />

            {/*
             * READ - BACKUP KEY FEATURE
             * Planned to be released during the account feature
             * due to timings, this feature is expected to be implemented
             * in future iterations
             */}

            {/* <SettingsGroup
              title={strings.screens.SecurityScreen.backupKey.title}
              items={[
                {
                  key: 'backup-key-text',
                  template: (
                    <View style={tailwind('p-4')}>
                      <AppText>{strings.screens.SecurityScreen.backupKey.text}</AppText>
                    </View>
                  ),
                },
                {
                  key: 'backup-key-action',
                  template: (
                    <View style={tailwind('flex-row items-center justify-between px-4 py-3')}>
                      <AppText style={tailwind('text-lg text-primary')}>
                        {strings.screens.SecurityScreen.backupKey.action}
                      </AppText>
                      <CaretRight size={20} color={getColor('text-primary')} />
                    </View>
                  ),
                  onPress: onBackupKeyPressed,
                },
              ]}
            /> */}
          </View>
        </ScrollView>
      </AppScreen>
    </>
  );
};

export default SecurityScreen;
