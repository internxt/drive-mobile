import { CaretRight } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import ChangePasswordModal from '../../components/modals/ChangePasswordModal';
import SettingsGroup from '../../components/SettingsGroup';
import Portal from '@burstware/react-native-portal';
import useGetColor from '../../hooks/useColor';
import { TabExplorerScreenProps } from '../../types/navigation';
import { useAppDispatch, useAppSelector } from 'src/store/hooks';
import { uiActions } from 'src/store/slices/ui';
import EnableTwoFactorModal from 'src/components/modals/EnableTwoFactorModal';
import DisableTwoFactorModal from 'src/components/modals/DisableTwoFactorModal';
import { authSelectors } from 'src/store/slices/auth';

const SecurityScreen = ({ navigation }: TabExplorerScreenProps<'Security'>) => {
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const { isEnableTwoFactorModalOpen, isDisableTwoFactorModalOpen } = useAppSelector((state) => state.ui);
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
  const onBackupKeyPressed = () => undefined;

  return (
    <>
      <Portal>
        <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={onChangePasswordModalClosed} />
        <EnableTwoFactorModal isOpen={isEnableTwoFactorModalOpen} onClose={onEnableTwoFactorModalClosed} />
        <DisableTwoFactorModal isOpen={isDisableTwoFactorModalOpen} onClose={onDisableTwoFactorModalClosed} />
      </Portal>

      <AppScreen safeAreaTop safeAreaColor={getColor('text-white')} style={tailwind('min-h-full')}>
        <ScrollView contentContainerStyle={tailwind('pb-10')}>
          <AppScreenTitle
            text={strings.screens.SecurityScreen.title}
            containerStyle={tailwind('bg-white')}
            centerText
            onBackButtonPressed={onBackButtonPressed}
          />

          <View style={tailwind('px-4 pt-8 bg-gray-5')}>
            {/* CHANGE PASSWORD */}
            <SettingsGroup
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
            />

            {/* TWO FACTOR */}
            <SettingsGroup
              title={strings.screens.SecurityScreen.twoFactor.title}
              items={[
                {
                  key: 'two-factor-text',
                  template: (
                    <View style={tailwind('p-4')}>
                      <AppText>{strings.screens.SecurityScreen.twoFactor.text}</AppText>
                    </View>
                  ),
                },
                {
                  key: 'two-factor-action',
                  template: (
                    <View style={tailwind('flex-row items-center justify-between px-4 py-3')}>
                      {is2FAEnabled ? (
                        <>
                          <AppText style={tailwind('text-red- text-lg')}>
                            {strings.screens.SecurityScreen.twoFactor.disable}
                          </AppText>
                          <CaretRight size={20} color={getColor('text-red-')} />
                        </>
                      ) : (
                        <>
                          <AppText style={tailwind('text-lg text-primary')}>
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

            {/* BACKUP KEY */}
            <SettingsGroup
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
            />
          </View>
        </ScrollView>
      </AppScreen>
    </>
  );
};

export default SecurityScreen;
