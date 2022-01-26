import React, { useEffect } from 'react';
import { Text, View, Platform, Alert, BackHandler, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import * as Unicons from '@iconscout/react-native-unicons';

import FileList from '../../components/FileList';
import analytics, { getAnalyticsData } from '../../services/analytics';
import { loadValues } from '../../services/storage';
import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchInput from '../../components/SearchInput';
import globalStyle from '../../styles/global.style';
import ScreenTitle from '../../components/ScreenTitle';
import Separator from '../../components/Separator';
import { AppScreen, DevicePlatform, SortType } from '../../types';
import { notify } from '../../services/toast';
import { authActions, authThunks } from '../../store/slices/auth';
import { filesActions, filesThunks } from '../../store/slices/storage';
import { layoutActions } from '../../store/slices/layout';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigation } from '@react-navigation/native';
import { NavigationStackProp } from 'react-navigation-stack';

function DriveScreen(): JSX.Element {
  const navigation = useNavigation<NavigationStackProp>();
  const dispatch = useAppDispatch();
  const { token, user, loggedIn } = useAppSelector((state) => state.auth);
  const { folderContent, uri, sortType } = useAppSelector((state) => state.files);
  const { searchActive, backButtonEnabled, fileViewMode } = useAppSelector((state) => state.layout);
  const searchString = useAppSelector((state) => state.files.searchString);
  const onSearchTextChanged = (value: string) => {
    dispatch(filesActions.setSearchString(value));
  };
  const parentFolderId = (() => {
    if (folderContent) {
      return folderContent.parentId || null;
    } else {
      return null;
    }
  })();
  let count = 0;
  const validateUri = () => {
    if (Platform.OS === 'ios') {
      return uri && folderContent && folderContent.currentFolder;
    } else {
      return uri.fileUri && folderContent && folderContent.currentFolder;
    }
  };
  const isRootFolder = folderContent && folderContent.id === user?.root_folder_id;
  const screenTitle = !isRootFolder && folderContent ? folderContent.name : strings.screens.drive.title;

  useEffect(() => {
    getAnalyticsData()
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

  // useEffect to trigger uploadFile while app on background
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (uri && validateUri() && folderContent) {
        const name = uri.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, folderContent.currentFolder);
        }, 3000);
      }
    } else {
      if (uri && validateUri() && folderContent) {
        const name = uri.fileUri.fileName.split('/').pop();

        setTimeout(() => {
          uploadFile(uri.fileUri, name, folderContent.currentFolder);
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
          uploadFile(uri, name, folderContent.currentFolder);
        }, 3000);
      }
    } else {
      if (uri && validateUri() && folderContent) {
        const name = uri.fileUri.fileName;

        setTimeout(() => {
          uploadFile(uri.fileUri, name, folderContent.currentFolder);
        }, 3000);
      }
    }

    // Set rootfoldercontent for MoveFilesModal
    parentFolderId === null ? dispatch(filesActions.setRootFolderContent(folderContent)) : null;

    // BackHandler
    const backAction = () => {
      if (folderContent && !folderContent.parentId) {
        count++;
        if (count < 2) {
          notify({ type: 'warn', text: strings.messages.pressAgainToExit });
        } else {
          BackHandler.exitApp();
        }

        // Reset if some time passes
        setTimeout(() => {
          count = 0;
        }, 4000);
      } else if (folderContent) {
        dispatch(filesThunks.getFolderContentThunk({ folderId: folderContent.parentId as number }));
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [folderContent]);

  const uploadFile = async (uri: string, name: string, currentFolder: number) => {
    dispatch(filesActions.setUri(undefined));
    const userData = await getAnalyticsData();

    try {
      const mnemonic = user?.mnemonic as string;
      const headers: { [key: string]: string } = {
        Authorization: `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data',
      };
      const regex = /^(.*:\/{0,2})\/?(.*)$/gm;

      analytics
        .track('file-upload-start', { userId: userData.uuid, email: userData.email, device: DevicePlatform.Mobile })
        .catch(() => undefined);
      dispatch(filesActions.uploadFileStart(name));

      const file = uri.replace(regex, '$2'); // if iOS remove file://
      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(uri);

      RNFetchBlob.fetch(
        'POST',
        `${process.env.REACT_NATIVE_DRIVE_API_URL}/api/storage/folder/${currentFolder}/upload`,
        headers,
        [{ name: 'xfile', filename: name, data: finalUri }],
      )
        .uploadProgress({ count: 10 }, (sent, total) => {
          dispatch(filesActions.uploadFileSetProgress({ progress: sent / total }));
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
            navigation.replace(AppScreen.OutOfSpace);
          } else if (res.respInfo.status === 201) {
            analytics
              .track('file-upload-finished', {
                userId: userData.uuid,
                email: userData.email,
                device: DevicePlatform.Mobile,
              })
              .catch(() => undefined);

            folderContent && dispatch(filesThunks.getFolderContentThunk({ folderId: folderContent.currentFolder }));
          } else {
            Alert.alert('Error', 'Can not upload file');
          }

          dispatch(filesActions.uploadFileSetProgress({ progress: 0 }));
          dispatch(filesActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            dispatch(authThunks.signOutThunk());
          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err.message);
          }

          dispatch(filesActions.uploadFileFailed({}));
          dispatch(filesActions.uploadFileFinished());
        });
    } catch (error) {
      analytics
        .track('file-upload-error', { userId: userData.uuid, email: userData.email, device: DevicePlatform.Mobile })
        .catch(() => undefined);
      dispatch(filesActions.uploadFileFailed({}));
      dispatch(filesActions.uploadFileFinished());
    }
  };

  if (!loggedIn) {
    navigation.replace(AppScreen.SignIn);
  }

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
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
            onPress={() => dispatch(filesThunks.goBackThunk({ folderId: parentFolderId as number }))}
          >
            <View style={[tailwind('flex-row items-center'), !parentFolderId && tailwind('opacity-50')]}>
              <Unicons.UilAngleLeft color={getColor('blue-60')} style={tailwind('-ml-2 -mr-1')} size={32} />
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
              onPress={() => dispatch(layoutActions.setSearchActive(!searchActive))}
            >
              <Unicons.UilSearch color={getColor('blue-60')} size={22} />
            </TouchableOpacity>
          </View>
          <View style={tailwind('items-center justify-center')}>
            <TouchableOpacity
              style={tailwind('p-2')}
              onPress={() => {
                dispatch(layoutActions.setShowSettingsModal(true));
              }}
            >
              <Unicons.UilEllipsisH color={getColor('blue-60')} size={22} />
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
      <View style={[tailwind('flex-row justify-between mt-4 mb-2 px-5')]}>
        <TouchableWithoutFeedback
          onPress={() => {
            dispatch(layoutActions.setShowSortModal(true));
          }}
        >
          <View style={tailwind('flex-row items-center')}>
            <Text style={tailwind('text-neutral-100')}>{strings.screens.drive.sort[sortType as SortType]}</Text>
            <Unicons.UilAngleDown size={20} color={getColor('neutral-100')} />
          </View>
        </TouchableWithoutFeedback>
        <View>
          <TouchableOpacity
            onPress={() => {
              dispatch(layoutActions.switchFileViewMode());
            }}
          >
            <>
              {fileViewMode === 'list' ? (
                <Unicons.UilApps size={22} color={getColor('neutral-100')} />
              ) : (
                <Unicons.UilListUl size={22} color={getColor('neutral-100')} />
              )}
            </>
          </TouchableOpacity>
        </View>
      </View>

      <Separator />

      <FileList isGrid={fileViewMode === 'grid'} />
    </View>
  );
}

export default DriveScreen;
