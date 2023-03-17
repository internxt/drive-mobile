import React, { useContext, useEffect, useRef, useState } from 'react';
import { Linking, View, ScrollView } from 'react-native';
import { Bug, CaretRight, FileText, FolderSimple, Info, Question, Translate, Trash } from 'phosphor-react-native';

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
import AppSwitch from 'src/components/AppSwitch';
import { PhotosContext } from 'src/contexts/Photos';
import BottomModal from 'src/components/modals/BottomModal';
import { PhotosPermissions } from '../PhotosPermissionsScreen';
import Portal from '@burstware/react-native-portal';
import { PermissionStatus } from 'expo-media-library';
import { imageService, PROFILE_PICTURE_CACHE_KEY } from '@internxt-mobile/services/common';
import { fs } from '@internxt-mobile/services/FileSystemService';
import errorService from '@internxt-mobile/services/ErrorService';
import { notifications } from '@internxt-mobile/services/NotificationsService';

function SettingsScreen({ navigation, route }: SettingsScreenProps<'SettingsHome'>): JSX.Element {
  const [photosPermissionsModalOpen, setPhotosPermissionsModalOpen] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [gettingLogs, setGettingLogs] = useState(false);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const scrollViewRef = useRef<ScrollView | null>(null);

  const photosCtx = useContext(PhotosContext);
  const { user } = useAppSelector((state) => state.auth);
  const usagePercent = useAppSelector(storageSelectors.usagePercent);
  const [profileAvatar, setProfileAvatar] = useState<string>();
  const [enablePhotosSyncScrollPoint, setEnablePhotosSyncScrollPoint] = useState(0);
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

  useEffect(() => {
    if (route?.params?.focusEnablePhotosSync && enablePhotosSyncScrollPoint) {
      highlightEnablePhotosSyncSection();
    }
  }, [route?.params?.focusEnablePhotosSync]);

  const highlightEnablePhotosSyncSection = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, y: enablePhotosSyncScrollPoint, animated: true });
      setTimeout(() => {
        setHighlightedSection('photos-sync');
        setTimeout(() => {
          setHighlightedSection(null);
        }, 500);
      }, 200);
    }, 500);
  };
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

  const handlePermissionsGranted = async () => {
    await photosCtx.enableSync(true);
    setPhotosPermissionsModalOpen(false);
  };

  const onShareLogsPressed = async () => {
    try {
      setGettingLogs(true);
      const exists = await fs.fileExistsAndIsNotEmpty(fs.getRuntimeLogsPath());
      if (!exists) {
        notifications.error(strings.errors.runtimeLogsMissing);
        return;
      }
      await fs.shareFile({
        title: 'Internxt Runtime logs',
        fileUri: fs.getRuntimeLogsPath(),
      });
    } catch (error) {
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
                        <AppText numberOfLines={1} medium style={tailwind('text-xl text-gray-80')}>
                          {userFullName}
                        </AppText>
                        <AppText numberOfLines={1} style={tailwind('text-gray-40')}>
                          {constants.SHOW_BILLING
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
                        {Number(usagePercent) ? (
                          <AppText style={tailwind('text-gray-40 mr-2.5')}>
                            {strings.formatString(strings.generic.usagePercent, usagePercent)}
                          </AppText>
                        ) : null}
                        <CaretRight color={getColor('text-neutral-60')} size={20} />
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
                        <CaretRight color={getColor('text-neutral-60')} size={20} />
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
              onLayout={(event) => {
                setEnablePhotosSyncScrollPoint(event.nativeEvent.layout.y);
              }}
              title={strings.screens.SettingsScreen.photos.title}
              items={[
                {
                  key: 'enable-photos-sync',
                  template: (
                    <View
                      style={[
                        tailwind(
                          `flex-row px-4 py-3 items-center border ${
                            highlightedSection === 'photos-sync' ? 'border-primary' : 'border-transparent'
                          } rounded-xl`,
                        ),
                      ]}
                    >
                      <View style={tailwind('flex-1 pr-4')}>
                        <AppText style={tailwind('text-lg text-gray-80')}>
                          {strings.screens.SettingsScreen.photos.enablePhotosBackup.title}
                        </AppText>
                        <AppText style={tailwind('text-xs text-gray-40')}>
                          {strings.screens.SettingsScreen.photos.enablePhotosBackup.message}
                        </AppText>
                      </View>
                      <View style={tailwind('')}>
                        <AppSwitch
                          value={photosCtx.syncEnabled}
                          onChange={async (event) => {
                            const { canEnable, permissionsStatus } = await photosCtx.enableSync(
                              event.nativeEvent.value,
                            );
                            if (!canEnable) {
                              if (permissionsStatus === PermissionStatus.UNDETERMINED) {
                                navigation.navigate('Photos');
                              } else {
                                setPhotosPermissionsModalOpen(true);
                              }
                            }
                          }}
                        />
                      </View>
                    </View>
                  ),
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
                {
                  key: 'share-logs',
                  loading: gettingLogs,
                  template: (
                    <View style={[tailwind('flex-row items-center px-4 py-3')]}>
                      <FileText size={24} color={getColor('text-primary')} style={tailwind('mr-3')} />
                      <View style={tailwind('flex-grow justify-center')}>
                        <AppText style={[tailwind('text-lg text-gray-80')]}>
                          {strings.screens.SettingsScreen.shareLogs}
                        </AppText>
                      </View>
                      <View style={tailwind('justify-center')}>
                        <CaretRight color={getColor('text-neutral-60')} size={20} />
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
                        <CaretRight color={getColor('text-neutral-60')} size={20} />
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
      <Portal>
        <BottomModal
          headerStyle={tailwind('bg-white')}
          header={<View></View>}
          isOpen={photosPermissionsModalOpen}
          onClosed={() => setPhotosPermissionsModalOpen(false)}
        >
          <View style={tailwind('mt-6')}>
            <PhotosPermissions onPermissionsGranted={handlePermissionsGranted} />
          </View>
        </BottomModal>
      </Portal>
    </>
  );
}

export default SettingsScreen;
