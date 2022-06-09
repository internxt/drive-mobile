import { CaretRight, CheckCircle, Warning } from 'phosphor-react-native';
import { Image, ScrollView, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import SettingsGroup from '../../components/SettingsGroup';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import { uiActions } from '../../store/slices/ui';
import { TabExplorerScreenProps } from '../../types/navigation';

function AccountScreen({ navigation }: TabExplorerScreenProps<'Account'>): JSX.Element {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const userFullName = useAppSelector(authSelectors.userFullName);
  const isEmailVerified = true;
  const onLogoutPressed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(true));
  };
  const onBillingPressed = () => {
    navigation.navigate('Billing');
  };
  const onSecurityPressed = () => {
    navigation.navigate('Security');
  };
  const accountDetailsItems = [
    {
      key: 'name',
      template: (
        <View style={[tailwind('flex-row items-center px-4 py-3')]}>
          <View style={tailwind('flex-grow justify-center')}>
            <AppText style={[tailwind('text-lg text-gray-80')]}>
              {strings.screens.AccountScreen.accountDetails.name}
            </AppText>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <AppText style={tailwind('text-gray-40 mr-2.5')}>{userFullName}</AppText>
            <CaretRight color={tailwind('text-neutral-60').color as string} size={20} />
          </View>
        </View>
      ),
    },
    {
      key: 'email',
      template: (
        <View style={[tailwind('flex-row items-center px-4 py-3')]}>
          <View style={tailwind('flex-grow justify-center')}>
            <AppText style={[tailwind('text-lg text-gray-80')]}>
              {strings.screens.AccountScreen.accountDetails.email}
            </AppText>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <AppText style={tailwind('text-gray-40 mr-2.5')}>{user?.email}</AppText>
            {isEmailVerified ? (
              <CheckCircle weight="fill" color={tailwind('text-primary').color as string} size={20} />
            ) : (
              <Warning weight="fill" color={tailwind('text-yellow-').color as string} size={20} />
            )}
          </View>
        </View>
      ),
    },
  ];

  !isEmailVerified &&
    accountDetailsItems.push({
      key: 'resend-email',
      template: (
        <View style={[tailwind('flex-row items-center px-4 py-3')]}>
          <View style={tailwind('flex-grow justify-center')}>
            <AppText style={[tailwind('text-lg text-primary')]}>
              {strings.screens.AccountScreen.accountDetails.resendEmail}
            </AppText>
          </View>
        </View>
      ),
    });

  return (
    <AppScreen
      safeAreaTop
      safeAreaColor={tailwind('text-white').color as string}
      backgroundColor={tailwind('text-gray-5').color as string}
      style={tailwind('min-h-full')}
    >
      <ScrollView>
        <AppScreenTitle text={strings.screens.AccountScreen.title} containerStyle={tailwind('bg-white')} centerText />

        <View style={tailwind('px-4')}>
          {/* PROFILE PICTURE */}
          <View style={tailwind('items-center my-8 px-4')}>
            <Image
              source={require('../../../assets/icon.png')}
              style={tailwind('mb-2 h-28 w-28 rounded-full border border-gray-5')}
            />
            <AppText style={tailwind('text-2xl text-gray-80')}>{userFullName}</AppText>
            <AppText style={tailwind('text-lg text-gray-40')}>{user?.email}</AppText>
          </View>

          {/* PLAN */}
          <SettingsGroup
            title={'Plan'}
            items={[
              {
                key: 'plan',
                template: (
                  <View style={tailwind('flex-row items-center justify-between px-4 py-4')}>
                    <View>
                      <AppText style={tailwind('text-primary text-2xl')}>{'4GB'}</AppText>
                      <AppText style={tailwind('text-sm text-gray-80')}>{'Free plan'}</AppText>
                    </View>
                    <AppButton
                      type="accept"
                      title={strings.components.buttons.upgrade}
                      onPress={onBillingPressed}
                      style={tailwind('rounded-3xl px-8')}
                    />
                  </View>
                ),
              },
            ]}
          />

          {/* ACCOUNT DETAILS */}
          <SettingsGroup title={'Account details'} items={accountDetailsItems} />

          {/* SECURITY */}
          <SettingsGroup
            title={strings.screens.AccountScreen.security.title}
            items={[
              {
                key: 'debug',
                template: (
                  <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-gray-80')]}>
                        {strings.screens.AccountScreen.security.title}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={tailwind('text-neutral-60').color as string} size={20} />
                    </View>
                  </View>
                ),
                onPress: onSecurityPressed,
              },
            ]}
            advice={strings.screens.AccountScreen.security.advice}
          />

          {/* LOGOUT */}
          <SettingsGroup
            items={[
              {
                key: 'logout',
                template: (
                  <View style={tailwind('px-4 py-3')}>
                    <AppText style={tailwind('text-center text-lg text-red-')}>
                      {strings.components.buttons.signOut}
                    </AppText>
                  </View>
                ),
                onPress: onLogoutPressed,
              },
            ]}
          />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default AccountScreen;
