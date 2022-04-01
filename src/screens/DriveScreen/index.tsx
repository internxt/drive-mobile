import React, { useEffect } from 'react';
import { Text, View, Platform, Alert, BackHandler, TouchableOpacity } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';

import FileList from '../../components/FileList';
import analytics, { AnalyticsEventKey } from '../../services/analytics';
import { loadValues } from '../../services/storage';
import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchInput from '../../components/SearchInput';
import globalStyle from '../../styles';
import ScreenTitle from '../../components/ScreenTitle';
import Separator from '../../components/Separator';
import { AppScreenKey as AppScreenKey, DevicePlatform, SortDirection } from '../../types';
import { authActions, authThunks } from '../../store/slices/auth';
import { storageActions, storageThunks } from '../../store/slices/storage';
import { uiActions } from '../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { constants } from '../../services/app';
import AppScreen from '../../components/AppScreen';
import { ArrowDown, ArrowUp, CaretLeft, DotsThree, MagnifyingGlass, Rows, SquaresFour } from 'phosphor-react-native';
import { deviceStorage } from '../../services/asyncStorage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

function DriveScreen(): JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { token, user, loggedIn } = useAppSelector((state) => state.auth);
  const { currentFolderId, folderContent, uri, sortType, sortDirection, searchString } = useAppSelector(
    (state) => state.storage,
  );
  const { searchActive, backButtonEnabled, fileViewMode } = useAppSelector((state) => state.ui);
  const onSearchTextChanged = (value: string) => {
    dispatch(storageActions.setSearchString(value));
  };
  const parentFolderId = (() => {
    if (folderContent) {
      return folderContent.parentId || null;
    } else {
      return null;
    }
  })();
  const validateUri = () => {
    if (Platform.OS === 'ios') {
      return uri && folderContent;
    } else {
      return uri.fileUri && folderContent;
    }
  };
  const isRootFolder = folderContent && folderContent.id === user?.root_folder_id;
  const screenTitle = !isRootFolder && folderContent ? folderContent.name : strings.screens.drive.title;
  const uploadFile = async (uri: string, name: string, currentFolder: number) => {
    dispatch(storageActions.setUri(undefined));
    const userData = await deviceStorage.getUser();

    try {
      const mnemonic = user?.mnemonic as string;
      const headers: { [key: string]: string } = {
        Authorization: `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data',
      };
      const regex = /^(.*:\/{0,2})\/?(.*)$/gm;

      analytics.track(AnalyticsEventKey.FileUploadStart, {
        userId: userData.uuid,
        email: userData.email,
        device: DevicePlatform.Mobile,
      });

      dispatch(storageActions.uploadFileStart(name));

      const file = uri.replace(regex, '$2'); // if iOS remove file://
      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(uri);

      RNFetchBlob.fetch(
        'POST',
        `${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/folder/${currentFolder}/upload`,
        headers,
        [{ name: 'xfile', filename: name, data: finalUri }],
      )
        .uploadProgress({ count: 10 }, (sent, total) => {
          dispatch(storageActions.uploadFileSetProgress({ progress: sent / total }));
        })
        .then((res) => {
          if (res.respInfo.status === 401) {
            throw res;
          }
          const data = res;

          return data;
        })
        .then((res) => {
          if (res.respInfo.status === 402) {
            navigation.replace(AppScreenKey.OutOfSpace);
          } else if (res.respInfo.status === 201) {
            analytics.track(AnalyticsEventKey.FileUploadFinished, {
              userId: userData.uuid,
              email: userData.email,
              device: DevicePlatform.Mobile,
            });

            folderContent && dispatch(storageThunks.getFolderContentThunk({ folderId: currentFolderId }));
          } else {
            Alert.alert('Error', 'Can not upload file');
          }

          dispatch(storageActions.uploadFileSetProgress({ progress: 0 }));
          dispatch(storageActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            dispatch(authThunks.signOutThunk());
          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err.message);
          }

          dispatch(storageActions.uploadFileFailed({}));
          dispatch(storageActions.uploadFileFinished());
        });
    } catch (error) {
      analytics.track(AnalyticsEventKey.FileUploadError, {
        userId: userData.uuid,
        email: userData.email,
        device: DevicePlatform.Mobile,
      });
      dispatch(storageActions.uploadFileFailed({}));
      dispatch(storageActions.uploadFileFinished());
    }
  };
  const onCurrentFolderActionsButtonPressed = () => {
    dispatch(storageActions.focusItem(folderContent));
    dispatch(uiActions.setShowItemModal(true));
  };
  const onSortButtonPressed = () => {
    dispatch(uiActions.setShowSortModal(true));
  };
  const onViewModeButtonPressed = () => {
    dispatch(uiActions.switchFileViewMode());
  };

  if (!loggedIn) {
    navigation.replace(AppScreenKey.SignIn);
  }

  useEffect(() => {
    deviceStorage
      .getUser()
      .then((userData) => {
        loadValues()
          .then((res) => {
            const currentPlan = {
              usage: parseInt(res.usage.toFixed(1)),
              limit: parseInt(res.limit.toFixed(1)),
              percentage: parseInt((res.usage / res.limit).toFixed(1)),
            };

            dispatch(authActions.setUserStorage(currentPlan));
            try {
              if (res) {
                analytics
                  .identify(userData.uuid, {
                    userId: userData.uuid,
                    email: userData.email,
                    platform: DevicePlatform.Mobile,
                    // eslint-disable-next-line camelcase
                    storage_used: currentPlan.usage,
                    // eslint-disable-next-line camelcase
                    storage_limit: currentPlan.limit,
                    // eslint-disable-next-line camelcase
                    storage_usage: currentPlan.percentage,
                  })
                  .catch(() => undefined);
              }
            } catch (err) {
              console.log('Error in analytics.identify: ', err);
            }
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (uri && validateUri() && folderContent) {
        const name = uri.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, currentFolderId);
        }, 3000);
      }
    } else {
      if (uri && validateUri() && folderContent) {
        const name = uri.fileUri.fileName.split('/').pop();

        setTimeout(() => {
          uploadFile(uri.fileUri, name, currentFolderId);
        }, 3000);
      }
    }
  }, [uri]);

  // seEffect to trigger uploadFile while app closed
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (validateUri() && folderContent) {
        const name = uri.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, currentFolderId);
        }, 3000);
      }
    } else {
      if (uri && validateUri() && folderContent) {
        const name = uri.fileUri.fileName;

        setTimeout(() => {
          uploadFile(uri.fileUri, name, currentFolderId);
        }, 3000);
      }
    }

    parentFolderId === null ? dispatch(storageActions.setRootFolderContent(folderContent)) : null;

    // BackHandler
    const backAction = () => {
      if (route.name === AppScreenKey.Drive) {
        if (folderContent && folderContent.parentId) {
          dispatch(storageThunks.getFolderContentThunk({ folderId: folderContent.parentId as number }));
        } else {
          return false;
        }
      }

      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [folderContent]);

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      {/* DRIVE NAV */}
      <View
        style={[
          tailwind('flex-row items-center justify-between my-2 px-5'),
          (isRootFolder || !folderContent) && tailwind('hidden'),
        ]}
      >
        <View>
          <TouchableOpacity
            disabled={!backButtonEnabled}
            onPress={() => dispatch(storageThunks.goBackThunk({ folderId: parentFolderId as number }))}
          >
            <View style={[tailwind('flex-row items-center'), !parentFolderId && tailwind('opacity-50')]}>
              <CaretLeft weight="bold" color={getColor('blue-60')} style={tailwind('-ml-2 mr-1')} size={24} />
              <Text style={[tailwind('text-blue-60 text-lg'), globalStyle.fontWeight.medium]}>
                {strings.components.buttons.back}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={tailwind('flex-row -m-2')}>
          <View style={tailwind('items-center justify-center')}>
            <TouchableOpacity
              style={tailwind('p-2')}
              onPress={() => dispatch(uiActions.setSearchActive(!searchActive))}
            >
              <MagnifyingGlass weight="bold" color={getColor('blue-60')} size={24} />
            </TouchableOpacity>
          </View>
          <View style={tailwind('items-center justify-center')}>
            <TouchableOpacity style={tailwind('p-2')} onPress={onCurrentFolderActionsButtonPressed}>
              <DotsThree weight="bold" color={getColor('blue-60')} size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScreenTitle text={screenTitle} showBackButton={false} />

      {(isRootFolder || !folderContent || searchActive) && (
        <SearchInput
          value={searchString}
          onChangeText={onSearchTextChanged}
          placeholder={strings.screens.drive.searchInThisFolder}
        />
      )}

      {/* FILE LIST ACTIONS */}
      <View style={[tailwind('flex-row justify-between items-center')]}>
        <TouchableOpacity onPress={onSortButtonPressed}>
          <View style={tailwind('px-5 py-1 flex-row items-center')}>
            <Text style={tailwind('text-base text-neutral-100 mr-1')}>{strings.screens.drive.sort[sortType]}</Text>
            {sortDirection === SortDirection.Asc ? (
              <ArrowUp weight="bold" size={15} color={getColor('neutral-100')} />
            ) : (
              <ArrowDown weight="bold" size={15} color={getColor('neutral-100')} />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onViewModeButtonPressed}>
          <View style={tailwind('py-2 px-5')}>
            {fileViewMode === 'list' ? (
              <SquaresFour size={22} color={getColor('neutral-100')} />
            ) : (
              <Rows size={22} color={getColor('neutral-100')} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Separator />

      <FileList isGrid={fileViewMode === 'grid'} />
    </AppScreen>
  );
}

export default DriveScreen;
