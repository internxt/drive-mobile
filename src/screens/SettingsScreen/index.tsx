import React, { useEffect, useRef, useState } from 'react';
import { Linking, View, ScrollView, Platform } from 'react-native';
import { Bug, CaretRight, FileText, FolderSimple, Info, Question, Translate, Trash } from 'phosphor-react-native';

import strings from '../../../assets/lang/strings';
import AppVersionWidget from '../../components/AppVersionWidget';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { authSelectors } from '../../store/slices/auth';
import AppScreen from '../../components/AppScreen';
import appService from '../../services/AppService';
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

import { imageService, logger, PROFILE_PICTURE_CACHE_KEY } from '@internxt-mobile/services/common';
import { fs } from '@internxt-mobile/services/FileSystemService';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';
import { internxtMobileSDKUtils } from '@internxt/mobile-sdk';

import { paymentsSelectors } from 'src/store/slices/payments';

function SettingsScreen({ navigation }: SettingsScreenProps<'SettingsHome'>): JSX.Element {
  const [gettingLogs, setGettingLogs] = useState(false);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const showBilling = useAppSelector(paymentsSelectors.shouldShowBilling);
  const { user } = useAppSelector((state) => state.auth);
  const usagePercent = useAppSelector(storageSelectors.usagePercent);
  const [profileAvatar, setProfileAvatar] = useState<string>();
  const userFullName = useAppSelector(authSelectors.userFullName);
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

  const onAccountPressed = () => {
    navigation.navigate('Account');
  };
  const onSignOutPressed = () => {
    dispatch(uiActions.setIsSignOutModalOpen(true));
  };
  const onStoragePressed = () => {
    navigation.navigate('Storage');
  };

  const onTrashPressed = () => {
    navigation.navigate('Trash');
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
    Linking.openURL(appService.urls.termsAndConditions);
  };
  const onDebugPressed = () => {
    navigation.push('Debug');
  };

  const onShareLogsPressed = async () => {
    try {
      setGettingLogs(true);
      const exists = await fs.fileExistsAndIsNotEmpty(fs.getRuntimeLogsPath());

      if (Platform.OS === 'android') {
        await internxtMobileSDKUtils.saveNativeLogs();
      }

      if (Platform.OS === 'ios') {
        await fs.shareFile({
          title: 'Internxt Runtime logs',
          fileUri: fs.getRuntimeLogsPath(),
          saveToiOSFiles: true,
        });
      }

      if (Platform.OS === 'android' && exists) {
        await fs.moveToAndroidDownloads(fs.getRuntimeLogsPath());
      }

      notifications.success(strings.messages.logFileMovedToDownloads);
    } catch (error) {
      logger.error(`Failed to save logs: ${error}`);
      notifications.error(strings.errors.generic.title);
    } finally {
      setGettingLogs(false);
    }
  };

  return (
    <>
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
        <ScrollView ref={scrollViewRef}>
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
                      <UserProfilePicture uri={profileAvatar} size={56} />

                      <View style={tailwind('flex-grow flex-1 ml-3')}>
                        <AppText numberOfLines={1} medium style={tailwind('text-xl text-gray-100')}>
                          {userFullName}
                        </AppText>
                        <AppText numberOfLines={1} style={tailwind('text-gray-40')}>
                          {showBilling
                            ? strings.screens.SettingsScreen.account.advice
                            : strings.screens.SettingsScreen.account.adviceNoBilling}
                        </AppText>
                      </View>

                      <View style={tailwind('items-end')}>
                        <CaretRight color={getColor('text-gray-40')} size={20} />
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
                      <AppText style={tailwind('text-center text-lg text-red')}>{strings.buttons.signOut}</AppText>
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
                        {Number(usagePercent) ? (
                          <AppText style={tailwind('text-gray-40 mr-2.5')}>
                            {strings.formatString(strings.generic.usagePercent, usagePercent)}
                          </AppText>
                        ) : null}
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onStoragePressed,
                },
                {
                  key: 'trash',
                  template: (
                    <View style={[tailwind('flex-row items-center  px-4 py-3')]}>
                      <Trash size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                      <View style={tailwind('flex-grow justify-center')}>
                        <AppText style={[tailwind('text-lg text-gray-80')]}>
                          {strings.screens.SettingsScreen.trash}
                        </AppText>
                      </View>
                      <View style={tailwind('flex-row items-center')}>
                        {/* Disabled until we can get the Trash size */}
                        {/* <AppText style={tailwind('text-gray-40 mr-2.5')}>{prettysize(0)}</AppText> */}
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onTrashPressed,
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
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onLanguagePressed,
                },
              ]}
            />

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
                        <CaretRight color={getColor('text-gray-40')} size={20} />
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
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onMoreInfoPressed,
                },
                {
                  key: 'share-logs',
                  loading: gettingLogs,
                  template: (
                    <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                      <FileText size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                      <View style={tailwind('flex-grow justify-center')}>
                        <AppText style={[tailwind('text-lg text-gray-80')]}>
                          {strings.screens.SettingsScreen.saveLogs}
                        </AppText>
                      </View>
                      <View style={tailwind('justify-center')}>
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onShareLogsPressed,
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
                        <CaretRight color={getColor('text-gray-40')} size={20} />
                      </View>
                    </View>
                  ),
                  onPress: onTermsAndConditionsPressed,
                },
              ]}
            />

            {/* DEBUG */}
            {appService.isDevMode && (
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
                          <CaretRight color={getColor('text-gray-40')} size={20} />
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
    </>
  );
}

export default SettingsScreen;
