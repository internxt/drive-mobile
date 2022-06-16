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

const SecurityScreen = ({ navigation }: TabExplorerScreenProps<'Security'>) => {
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const tailwind = useTailwind();
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
  const onTwoFactorPressed = () => undefined;
  const onBackupKeyPressed = () => undefined;

  return (
    <>
      <Portal>
        <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={onChangePasswordModalClosed} />
      </Portal>

      <AppScreen safeAreaTop safeAreaColor={getColor('text-white')} style={tailwind('min-h-full')}>
        <ScrollView>
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
                      <AppText style={tailwind('text-lg text-primary')}>
                        {strings.screens.SecurityScreen.twoFactor.action}
                      </AppText>
                      <CaretRight size={20} color={getColor('text-primary')} />
                    </View>
                  ),
                  onPress: onTwoFactorPressed,
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
