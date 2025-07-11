import { imageService, PROFILE_PICTURE_CACHE_KEY } from '@internxt-mobile/services/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { fs } from '@internxt-mobile/services/FileSystemService';
import { CaretRight, CheckCircle, Warning } from 'phosphor-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, TouchableWithoutFeedback, View } from 'react-native';
import storageService from 'src/services/StorageService';
import { paymentsSelectors } from 'src/store/slices/payments';
import { useTailwind } from 'tailwind-rn';
import { useCountdown } from 'usehooks-ts';
import strings from '../../../assets/lang/strings';
import AppButton from '../../components/AppButton';
import AppScreen from '../../components/AppScreen';
import AppScreenTitle from '../../components/AppScreenTitle';
import AppText from '../../components/AppText';
import SettingsGroup from '../../components/SettingsGroup';
import UserProfilePicture from '../../components/UserProfilePicture';
import { openUrl } from '../../helpers/utils';
import useGetColor from '../../hooks/useColor';
import { PRICING_URL } from '../../services/drive/constants';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authSelectors, authThunks } from '../../store/slices/auth';
import { uiActions } from '../../store/slices/ui';
import { SettingsScreenProps } from '../../types/navigation';

function AccountScreen({ navigation }: SettingsScreenProps<'Account'>): JSX.Element {
  const showBilling = useAppSelector(paymentsSelectors.shouldShowBilling);

  const [verificationEmailTime, { startCountdown, resetCountdown }] = useCountdown({
    countStart: 90,
    intervalMs: 1000,
  });
  const formattedVerificationEmailTime = useMemo(() => {
    const minutes = Math.floor(verificationEmailTime / 60);
    const seconds = verificationEmailTime % 60;
    const minutesText = minutes.toString().padStart(2, '0');
    const secondsText = seconds.toString().padStart(2, '0');

    return `${minutesText}:${secondsText}`;
  }, [verificationEmailTime]);
  const [isVerificationEmailEnabled, setIsVerificationEmailEnabled] = useState(true);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const [profileAvatar, setProfileAvatar] = useState<string>();
  const { subscription } = useAppSelector((state) => state.payments);
  const { limit } = useAppSelector((state) => state.storage);
  const user = useAppSelector((state) => state.auth.user);
  const userFullName = useAppSelector(authSelectors.userFullName);
  const hasPaidPlan = useAppSelector(paymentsSelectors.hasPaidPlan);

  useEffect(() => {
    if (!user?.avatar) {
      return setProfileAvatar(undefined);
    }

    imageService
      .getCachedImage(PROFILE_PICTURE_CACHE_KEY)
      .then((cachedImage) => {
        if (!user.avatar) return;
        if (cachedImage) {
          setProfileAvatar(fs.pathToUri(cachedImage));
        } else if (user?.avatar) {
          setProfileAvatar(user?.avatar);
        }
      })
      .catch((err) => {
        errorService.reportError(err);
        if (user?.avatar) {
          setProfileAvatar(user.avatar);
        }
      });
  }, [user?.avatar]);

  const onBackButtonPressed = () => {
    navigation.goBack();
  };
  const onDeleteAccountPressed = () => {
    if (subscription.type === 'free') {
      dispatch(uiActions.setIsDeleteAccountModalOpen(true));
    } else {
      Alert.alert(strings.screens.AccountScreen.warningUnableToDeleteAccount);
    }
  };
  const onBillingPressed = () => {
    openUrl(PRICING_URL);
  };

  const onManageSubscriptionPressed = () => {
    navigation.navigate('Plan');
  };
  const onSecurityPressed = () => {
    dispatch(uiActions.setIsSecurityModalOpen(true));
  };
  const onProfilePicturePressed = () => {
    dispatch(uiActions.setIsChangeProfilePictureModalOpen(true));
  };
  const onNamePressed = () => {
    dispatch(uiActions.setIsEditNameModalOpen(true));
  };
  const onSendVerificationEmailPressed = () => {
    setIsVerificationEmailEnabled(false);
    resetCountdown();
    startCountdown();
    dispatch(authThunks.sendVerificationEmailThunk());
  };
  const accountDetailsItems = [
    {
      key: 'name',
      template: (
        <View style={[tailwind('flex-row items-center px-4 py-3')]}>
          <View style={tailwind('flex-grow justify-center')}>
            <AppText style={[tailwind('text-lg')]}>{strings.screens.AccountScreen.accountDetails.name}</AppText>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <AppText style={[tailwind('mr-2.5'), { color: getColor('text-gray-40') }]}>{userFullName}</AppText>
            <CaretRight color={getColor('text-gray-40')} size={20} />
          </View>
        </View>
      ),
      onPress: onNamePressed,
    },
    {
      key: 'email',
      template: (
        <View style={[tailwind('flex-row items-center px-4 py-3')]}>
          <View style={tailwind('flex-grow justify-center')}>
            <AppText style={[tailwind('text-lg')]}>{strings.screens.AccountScreen.accountDetails.email}</AppText>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <AppText style={[tailwind('mr-2.5'), { color: getColor('text-gray-40') }]}>{user?.email}</AppText>
            {user?.emailVerified ? (
              <CheckCircle weight="fill" color={getColor('text-green')} size={20} />
            ) : (
              <Warning weight="fill" color={getColor('text-yellow')} size={20} />
            )}
          </View>
        </View>
      ),
    },
  ];

  !user?.emailVerified &&
    accountDetailsItems.push({
      key: 'resend-email',
      template: (
        <View style={[tailwind('flex-row items-center px-4 py-3')]}>
          <View style={tailwind('flex-row flex-grow items-center justify-between')}>
            {isVerificationEmailEnabled ? (
              <AppText style={[tailwind('text-lg'), { color: getColor('text-primary') }]}>
                {strings.screens.AccountScreen.accountDetails.resendEmail}
              </AppText>
            ) : (
              <>
                <AppText style={[tailwind('text-lg'), { color: getColor('text-gray-50') }]}>
                  {strings.screens.AccountScreen.accountDetails.resendEmail}
                </AppText>
                <AppText style={[tailwind('text-lg'), { color: getColor('text-gray-20') }]}>
                  {formattedVerificationEmailTime}
                </AppText>
              </>
            )}
          </View>
        </View>
      ),
      onPress: isVerificationEmailEnabled ? onSendVerificationEmailPressed : undefined,
    });

  useEffect(() => {
    if (verificationEmailTime === 0) {
      setIsVerificationEmailEnabled(true);
    }
  }, [verificationEmailTime]);

  return (
    <AppScreen safeAreaTop safeAreaBottom style={[tailwind('flex-1'), { backgroundColor: getColor('bg-gray-5') }]}>
      <AppScreenTitle
        text={strings.screens.AccountScreen.title}
        containerStyle={{ backgroundColor: getColor('bg-surface') }}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 80,
        }}
      >
        <View style={[tailwind('pb-10 px-4'), { backgroundColor: getColor('bg-gray-5') }]}>
          {/* PROFILE PICTURE */}
          <View style={tailwind('items-center my-8 px-4')}>
            <TouchableWithoutFeedback onPress={onProfilePicturePressed}>
              <View>
                <UserProfilePicture uri={profileAvatar} size={112} />
                <View
                  style={{
                    ...tailwind('rounded-b-full justify-end w-28 h-28 absolute'),
                    overflow: 'hidden',
                  }}
                >
                  <View style={[tailwind('pt-1 pb-1.5'), { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <AppText style={[tailwind('text-xs text-center'), { color: getColor('text-white') }]}>
                      {strings.buttons.edit.toUpperCase()}
                    </AppText>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
            <AppText style={[tailwind('text-2xl'), { color: getColor('text-gray-80') }]}>{userFullName}</AppText>
            <AppText style={[tailwind('text-lg'), { color: getColor('text-gray-40') }]}>{user?.email}</AppText>
          </View>
          {/* PLAN */}
          <SettingsGroup
            title={'Plan'}
            items={[
              {
                key: 'plan',
                template: (
                  <View style={tailwind('flex-row items-center justify-between px-4 py-3')}>
                    <View>
                      <AppText style={[tailwind('text-2xl'), { color: getColor('text-primary') }]}>
                        {storageService.toString(limit)}
                      </AppText>
                      <AppText style={[tailwind('text-sm'), { color: getColor('text-gray-80') }]}>
                        {strings.subscriptions[subscription.type]}
                      </AppText>
                    </View>
                    {showBilling ? (
                      hasPaidPlan ? (
                        <View style={tailwind('flex-row items-center')}>
                          <AppText style={[tailwind('mr-2.5'), { color: getColor('text-gray-40') }]}>
                            {strings.buttons.manage}
                          </AppText>
                          <CaretRight color={getColor('text-gray-40')} size={20} />
                        </View>
                      ) : (
                        <AppButton
                          type="accept"
                          title={strings.buttons.upgrade}
                          onPress={onBillingPressed}
                          style={tailwind('rounded-3xl px-8 py-2')}
                        />
                      )
                    ) : null}
                  </View>
                ),
                onPress: hasPaidPlan && showBilling ? onManageSubscriptionPressed : undefined,
              },
            ]}
          />
          {/* ACCOUNT DETAILS */}
          <SettingsGroup title={strings.screens.AccountScreen.accountDetails.title} items={accountDetailsItems} />
          {/* SECURITY */}
          <SettingsGroup
            title={strings.screens.AccountScreen.security.title}
            items={[
              {
                key: 'debug',
                template: (
                  <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg')]}>{strings.screens.AccountScreen.security.title}</AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('text-gray-40')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onSecurityPressed,
              },
            ]}
            advice={strings.screens.AccountScreen.security.advice}
          />
          {/* DELETE ACCOUNT */}
          <SettingsGroup
            items={[
              {
                key: 'delete-account',
                template: (
                  <View style={tailwind('px-4 py-3')}>
                    <AppText style={[tailwind('text-center text-lg'), { color: getColor('text-red') }]}>
                      {strings.screens.AccountScreen.deleteAccount}
                    </AppText>
                  </View>
                ),
                onPress: onDeleteAccountPressed,
              },
            ]}
          />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default AccountScreen;
