import React, { useEffect } from 'react';
import { Text, View, Platform, Alert, BackHandler, TouchableOpacity } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';

import DriveList from '../../components/DriveList';
import analytics, { AnalyticsEventKey } from '../../services/analytics';
import { loadValues } from '../../services/storage';
import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchInput from '../../components/SearchInput';
import globalStyle from '../../styles';
import ScreenTitle from '../../components/AppScreenTitle';
import Separator from '../../components/AppSeparator';
import { AppScreenKey as AppScreenKey, DevicePlatform } from '../../types';
import { authActions, authThunks } from '../../store/slices/auth';
import { driveActions, driveSelectors, driveThunks } from '../../store/slices/drive';
import { uiActions } from '../../store/slices/ui';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { constants } from '../../services/app';
import AppScreen from '../../components/AppScreen';
import { ArrowDown, ArrowUp, CaretLeft, DotsThree, MagnifyingGlass, Rows, SquaresFour } from 'phosphor-react-native';
import { asyncStorage } from '../../services/asyncStorage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriveListType, SortDirection } from '../../types/drive';

function DriveScreen(): JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { token, user, loggedIn } = useAppSelector((state) => state.auth);
  const { folderContentResponse, uri, sortType, sortDirection, searchString } = useAppSelector((state) => state.drive);
  const {
    id: currentFolderId,
    name: currentFolderName,
    parentId: currentFolderParentId,
  } = useAppSelector(driveSelectors.navigationStackPeek);
  const driveItems = useAppSelector(driveSelectors.driveItems);
  const { searchActive, backButtonEnabled, fileViewMode } = useAppSelector((state) => state.ui);
  const onSearchTextChanged = (value: string) => {
    dispatch(driveActions.setSearchString(value));
  };
  const validateUri = () => {
    if (Platform.OS === 'ios') {
      return uri;
    } else {
      return uri.fileUri;
    }
  };
  const isRootFolder = currentFolderId === user?.root_folder_id;
  const screenTitle = !isRootFolder ? currentFolderName : strings.screens.drive.title;
  const uploadFile = async (uri: string, name: string, currentFolder: number) => {
    dispatch(driveActions.setUri(undefined));
    const userData = await asyncStorage.getUser();

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

      dispatch(driveActions.uploadFileStart(name));

      const file = uri.replace(regex, '$2'); // if iOS remove file://
      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(uri);

      RNFetchBlob.fetch(
        'POST',
        `${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/folder/${currentFolder}/upload`,
        headers,
        [{ name: 'xfile', filename: name, data: finalUri }],
      )
        .uploadProgress({ count: 10 }, (sent, total) => {
          dispatch(driveActions.uploadFileSetProgress({ progress: sent / total }));
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
            dispatch(uiActions.setShowRunOutSpaceModal(true));
          } else if (res.respInfo.status === 201) {
            analytics.track(AnalyticsEventKey.FileUploadFinished, {
              userId: userData.uuid,
              email: userData.email,
              device: DevicePlatform.Mobile,
            });

            dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderId }));
          } else {
            Alert.alert('Error', 'Can not upload file');
          }

          dispatch(driveActions.uploadFileSetProgress({ progress: 0 }));
          dispatch(driveActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            dispatch(authThunks.signOutThunk());
          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err.message);
          }

          dispatch(driveActions.uploadFileFailed({}));
          dispatch(driveActions.uploadFileFinished());
        });
    } catch (error) {
      analytics.track(AnalyticsEventKey.FileUploadError, {
        userId: userData.uuid,
        email: userData.email,
        device: DevicePlatform.Mobile,
      });
      dispatch(driveActions.uploadFileFailed({}));
      dispatch(driveActions.uploadFileFinished());
    }
  };
  const onCurrentFolderActionsButtonPressed = () => {
    dispatch(driveActions.focusItem(folderContentResponse));
    dispatch(uiActions.setShowItemModal(true));
  };
  const onSortButtonPressed = () => {
    dispatch(uiActions.setShowSortModal(true));
  };
  const onViewModeButtonPressed = () => {
    dispatch(uiActions.switchFileViewMode());
  };
  const onBackButtonPressed = () => {
    dispatch(driveThunks.goBackThunk({ folderId: currentFolderParentId as number }));
  };

  if (!loggedIn) {
    navigation.replace(AppScreenKey.SignIn);
  }

  useEffect(() => {
    asyncStorage
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
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);

    // BackHandler
    const backAction = () => {
      if (route.name === AppScreenKey.Drive) {
        if (~currentFolderId && currentFolderParentId) {
          dispatch(driveThunks.getFolderContentThunk({ folderId: currentFolderParentId }));
        } else {
          return false;
        }
      }

      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      backHandler.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (uri && validateUri() && ~currentFolderId) {
        const name = uri.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, currentFolderId);
        }, 3000);
      }
    } else {
      if (uri && validateUri() && ~currentFolderId) {
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
      if (validateUri() && ~currentFolderId) {
        const name = uri?.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, currentFolderId);
        }, 3000);
      }
    } else {
      if (uri && validateUri() && ~currentFolderId) {
        const name = uri.fileUri.fileName;

        setTimeout(() => {
          uploadFile(uri.fileUri, name, currentFolderId);
        }, 3000);
      }
    }
  }, [currentFolderId]);

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1')}>
      {/* DRIVE NAV */}
      <View style={[tailwind('flex-row items-center justify-between my-2 px-5'), isRootFolder && tailwind('hidden')]}>
        <TouchableOpacity disabled={!backButtonEnabled} onPress={onBackButtonPressed}>
          <View style={[tailwind('flex-row items-center pr-4'), !currentFolderParentId && tailwind('opacity-50')]}>
            <CaretLeft weight="bold" color={getColor('blue-60')} style={tailwind('-ml-2 mr-1')} size={24} />
            <Text style={[tailwind('text-blue-60 text-lg'), globalStyle.fontWeight.medium]}>
              {strings.components.buttons.back}
            </Text>
          </View>
        </TouchableOpacity>
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

      {(isRootFolder || searchActive) && (
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

      <DriveList items={driveItems} type={DriveListType.Drive} viewMode={fileViewMode} />
    </AppScreen>
  );
}

export default DriveScreen;
