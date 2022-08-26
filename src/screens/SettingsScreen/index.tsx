import React from 'react';
import { Linking, View, ScrollView } from 'react-native';
import { Bug, CaretRight, FolderSimple, Info, Question, Translate } from 'phosphor-react-native';

import strings from '../../../assets/lang/strings';
import AppVersionWidget from '../../components/AppVersionWidget';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import AppScreen from '../../components/AppScreen';
import appService, { constants } from '../../services/AppService';
import AppText from '../../components/AppText';
import { SettingsScreenProps } from '../../types/navigation';
import AppScreenTitle from '../../components/AppScreenTitle';
import { useTailwind } from 'tailwind-rn';
import SettingsGroup from '../../components/SettingsGroup';
import useGetColor from '../../hooks/useColor';
import { uiActions } from '../../store/slices/ui';
import UserProfilePicture from '../../components/UserProfilePicture';
import { Language } from 'src/types';
import { storageSelectors } from 'src/store/slices/storage';

function SettingsScreen({ navigation }: SettingsScreenProps<'SettingsHome'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const usagePercent = useAppSelector(storageSelectors.usagePercent);
  const userFullName = useAppSelector(authSelectors.userFullName);
  const onAccountPressed = () => {
    navigation.navigate('Account');
  };
  const onSignOutPressed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(true));
  };
  const onStoragePressed = () => {
    navigation.navigate('Storage');
  };
  const onLanguagePressed = () => {
    dispatch(uiActions.setIsLanguageModalOpen(true));
  };
  const onSupportPressed = () => {
    Linking.openURL('mailto:hello@internxt.com');
  };
  const onMoreInfoPressed = () => {
    Linking.openURL('https://internxt.com');
  };
  const onTermsAndConditionsPressed = () => {
    Linking.openURL('https://internxt.com/legal');
  };
  const onDebugPressed = () => {
    navigation.push('Debug');
  };

  return (
    <AppScreen safeAreaTop safeAreaColor={getColor('text-white')} style={tailwind('bg-gray-5 flex-1')}>
      <AppScreenTitle
        text={strings.screens.SettingsScreen.title}
        containerStyle={tailwind('bg-white')}
        showBackButton={false}
        rightSlot={
          <View style={tailwind('flex-grow items-end justify-center')}>
            <AppVersionWidget />
          </View>
        }
      />
      <ScrollView>
        <View style={tailwind('px-4 pt-8 pb-10 flex-1')}>
          {/* ACCOUNT */}
          <SettingsGroup
            style={tailwind('mb-2')}
            title={strings.screens.SettingsScreen.account.title}
            items={[
              {
                key: 'account',
                template: (
                  <View style={tailwind('flex-row items-center p-4')}>
                    <UserProfilePicture uri={user?.avatar} size={56} />

                    <View style={tailwind('flex-grow flex-1 ml-3')}>
                      <AppText numberOfLines={1} medium style={tailwind('text-xl text-gray-80')}>
                        {userFullName}
                      </AppText>
                      <AppText numberOfLines={1} style={tailwind('text-gray-40')}>
                        {constants.REACT_NATIVE_SHOW_BILLING
                          ? strings.screens.SettingsScreen.account.advice
                          : strings.screens.SettingsScreen.account.adviceNoBilling}
                      </AppText>
                    </View>

                    <View style={tailwind('items-end')}>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onAccountPressed,
              },
            ]}
          />
          {/* SIGN OUT */}
          <SettingsGroup
            items={[
              {
                key: 'sign-out',
                template: (
                  <View style={tailwind('px-4 py-3')}>
                    <AppText style={tailwind('text-center text-lg text-red-')}>{strings.buttons.signOut}</AppText>
                  </View>
                ),
                onPress: onSignOutPressed,
              },
            ]}
          />

          {/* GENERAL */}
          <SettingsGroup
            title={strings.screens.SettingsScreen.general}
            items={[
              {
                key: 'storage',
                template: (
                  <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                    <FolderSimple size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-gray-80')]}>
                        {strings.screens.SettingsScreen.storage}
                      </AppText>
                    </View>
                    <View style={tailwind('flex-row items-center')}>
                      <AppText style={tailwind('text-gray-40 mr-2.5')}>
                        {strings.formatString(strings.generic.usagePercent, usagePercent)}
                      </AppText>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onStoragePressed,
              },
              {
                key: 'language',
                template: (
                  <View style={[tailwind('flex-row items-center  px-4 py-3')]}>
                    <Translate size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-gray-80')]}>
                        {strings.screens.SettingsScreen.language}
                      </AppText>
                    </View>
                    <View style={tailwind('flex-row items-center')}>
                      <AppText style={tailwind('text-gray-40 mr-2.5')}>
                        {strings.languages[strings.getLanguage() as Language]}
                      </AppText>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onLanguagePressed,
              },
            ]}
          />
          {/* PHOTOS GALLERY */}
          {/*<SettingsGroup
            title={strings.screens.SettingsScreen.photos.title}
            items={[
              {
                key: 'photos-mobile-data',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View>
                      <AppText style={tailwind('text-lg text-gray-80')}>
                        {strings.screens.SettingsScreen.photos.mobileData.title}
                      </AppText>
                      <AppText style={tailwind('text-xs text-gray-40')}>
                        {useMobileDataToUploadPhotos
                          ? strings.screens.SettingsScreen.photos.mobileData.wifiAndMobileData
                          : strings.screens.SettingsScreen.photos.mobileData.onlyWifi}
                      </AppText>
                    </View>
                    <View style={tailwind('flex-grow items-end justify-center')}>
                      <AppSwitch value={useMobileDataToUploadPhotos} />
                    </View>
                  </View>
                ),
              },
            ]}
          /> */}
          {/* INFORMATION */}
          <SettingsGroup
            title={strings.screens.SettingsScreen.information}
            items={[
              {
                key: 'support',
                template: (
                  <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                    <Question size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-gray-80')]}>
                        {strings.screens.SettingsScreen.support}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onSupportPressed,
              },
              {
                key: 'more-information',
                template: (
                  <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                    <Info size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-gray-80')]}>
                        {strings.screens.SettingsScreen.more}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onMoreInfoPressed,
              },
            ]}
          />
          {/* LEGAL */}
          <SettingsGroup
            title={strings.screens.SettingsScreen.legal}
            items={[
              {
                key: 'terms-and-conditions',
                template: (
                  <View style={[tailwind('flex-row px-4 py-3')]}>
                    <View style={tailwind('flex-grow justify-center')}>
                      <AppText style={[tailwind('text-lg text-gray-80')]}>
                        {strings.screens.SettingsScreen.termsAndConditions}
                      </AppText>
                    </View>
                    <View style={tailwind('justify-center')}>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onTermsAndConditionsPressed,
              },
            ]}
          />

          {/* DEBUG */}
          {appService.constants.REACT_NATIVE_DEBUG && (
            <SettingsGroup
              title={strings.screens.SettingsScreen.debug}
              items={[
                {
                  key: 'debug',
                  template: (
                    <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                      <Bug size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                      <View style={tailwind('flex-grow justify-center')}>
                        <AppText style={[tailwind('text-lg text-gray-80')]}>
                          {strings.screens.DebugScreen.title}
                        </AppText>
                      </View>
                      <View style={tailwind('justify-center')}>
                        <CaretRight color={getColor('text-neutral-60')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onDebugPressed,
                },
              ]}
            />
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

export default SettingsScreen;
