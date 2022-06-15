import React from 'react';
import { Linking, View, ScrollView, Image } from 'react-native';
import { Bug, CaretRight, FolderSimple, Info, Question, Translate } from 'phosphor-react-native';

import strings from '../../../assets/lang/strings';
import AppVersionWidget from '../../components/AppVersionWidget';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import AppScreen from '../../components/AppScreen';
import appService from '../../services/AppService';
import AppText from '../../components/AppText';
import { TabExplorerScreenProps } from '../../types/navigation';
import AppScreenTitle from '../../components/AppScreenTitle';
import { useTailwind } from 'tailwind-rn';
import AppSwitch from '../../components/AppSwitch';
import SettingsGroup from '../../components/SettingsGroup';
import useGetColor from '../../hooks/useColor';
import { uiActions } from '../../store/slices/ui';

function SettingsScreen({ navigation }: TabExplorerScreenProps<'Settings'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const useMobileDataToUploadPhotos = true;
  const userFullName = useAppSelector(authSelectors.userFullName);
  const onAccountPressed = () => {
    navigation.push('TabExplorer', { screen: 'Account' });
  };
  const onSignOutPressed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(true));
  };
  const onStoragePressed = () => {
    navigation.push('Storage');
  };
  const onLanguagePressed = () => undefined;
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
    <AppScreen safeAreaTop safeAreaColor={getColor('text-white')} style={tailwind('min-h-full')}>
      <ScrollView>
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
        <View style={tailwind('px-4 pt-8 flex-grow bg-gray-5')}>
          {/* ACCOUNT */}
          <SettingsGroup
            style={tailwind('mb-2')}
            title={'Account'}
            items={[
              {
                key: 'account',
                template: (
                  <View style={tailwind('flex-row items-center p-4')}>
                    <Image
                      source={require('../../../assets/icon.png')}
                      height={56}
                      width={56}
                      style={tailwind('h-14 w-14 rounded-full')}
                    />

                    <View style={tailwind('flex-grow flex-1 ml-3')}>
                      <AppText numberOfLines={1} medium style={tailwind('text-xl text-gray-80')}>
                        {userFullName}
                      </AppText>
                      <AppText numberOfLines={1} style={tailwind('text-gray-40')}>
                        {strings.screens.SettingsScreen.account.advice}
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
            title={'General'}
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
                      <AppText style={tailwind('text-gray-40 mr-2.5')}>51% Used</AppText>
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
                      <AppText style={tailwind('text-gray-40 mr-2.5')}>{strings.languages.en}</AppText>
                      <CaretRight color={getColor('text-neutral-60')} size={20} />
                    </View>
                  </View>
                ),
                onPress: onLanguagePressed,
              },
            ]}
          />
          {/* PHOTOS GALLERY */}
          <SettingsGroup
            title={'Photos Gallery'}
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
          />
          {/* INFORMATION */}
          <SettingsGroup
            title={'Information'}
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
            title={'Legal'}
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
              title={'Debug'}
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
