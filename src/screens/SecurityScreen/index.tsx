import { CaretRight } from 'phosphor-react-native';
import { ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import SettingsGroup from '../../components/SettingsGroup';

const SecurityScreen = () => {
  const tailwind = useTailwind();
  const onChangePasswordPressed = () => undefined;
  const onTwoFactorPressed = () => undefined;
  const onBackupKeyPressed = () => undefined;

  return (
    <AppScreen
      safeAreaTop
      safeAreaColor={tailwind('text-white').color as string}
      backgroundColor={tailwind('text-gray-5').color as string}
      style={tailwind('min-h-full')}
    >
      <ScrollView>
        <AppScreenTitle text={strings.screens.SecurityScreen.title} containerStyle={tailwind('bg-white')} centerText />

        <View style={tailwind('px-4 mt-8')}>
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
                    <CaretRight size={20} color={tailwind('text-primary').color as string} />
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
                    <CaretRight size={20} color={tailwind('text-primary').color as string} />
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
                    <CaretRight size={20} color={tailwind('text-primary').color as string} />
                  </View>
                ),
                onPress: onBackupKeyPressed,
              },
            ]}
          />
        </View>
      </ScrollView>
    </AppScreen>
  );
};

export default SecurityScreen;
