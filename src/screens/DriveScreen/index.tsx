import React, { useEffect, useState } from 'react';
import { Text, View, Platform, Alert, BackHandler, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { connect, useDispatch, useSelector } from 'react-redux';
import RNFetchBlob from 'rn-fetch-blob';
import * as Unicons from '@iconscout/react-native-unicons';

import { fileActions, layoutActions, userActions } from '../../store/actions';
import FileList from '../../components/FileList';
import { Reducers } from '../../store/reducers/reducers';
import analytics, { getAnalyticsData } from '../../services/analytics';
import { notify } from '../../helpers';
import { loadValues } from '../../services/storage';
import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchInput from '../../components/SearchInput';
import globalStyle from '../../styles/global.style';
import ScreenTitle from '../../components/ScreenTitle';
import Separator from '../../components/Separator';
import { AppScreen, DevicePlatform } from '../../types';

function DriveScreen(props: Reducers): JSX.Element {
  const dispatch = useDispatch();
  const { filesState } = props;
  const [selectedKeyId, setSelectedKeyId] = useState(0);
  const searchString = useSelector((state: Reducers) => state.filesState.searchString);
  const onSearchTextChanged = (value: string) => {
    dispatch(fileActions.setSearchString(value));
  };
  const parentFolderId = (() => {
    if (filesState.folderContent) {
      return filesState.folderContent.parentId || null;
    } else {
      return null;
    }
  })();
  let count = 0;
  const validateUri = () => {
    if (Platform.OS === 'ios') {
      return filesState.uri && filesState.folderContent && filesState.folderContent.currentFolder;
    } else {
      return filesState.uri.fileUri && filesState.folderContent && filesState.folderContent.currentFolder;
    }
  };
  const backButtonEnabled = props.layoutState.backButtonEnabled;
  const isRootFolder =
    props.filesState.folderContent &&
    props.filesState.folderContent.id === props.authenticationState.user.root_folder_id;
  const screenTitle =
    !isRootFolder && props.filesState.folderContent ? props.filesState.folderContent.name : strings.screens.drive.title;

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

            props.dispatch(userActions.setUserStorage(currentPlan));
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
      if (filesState.uri && validateUri()) {
        const uri = filesState.uri;
        const name = filesState.uri.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder);
        }, 3000);
      }
    } else {
      if (filesState.uri && validateUri()) {
        const uri = filesState.uri.fileUri;
        const name = filesState.uri.fileName.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder);
        }, 3000);
      }
    }
  }, [filesState.uri]);

  // seEffect to trigger uploadFile while app closed
  useEffect(() => {
    if (Platform.OS === 'ios') {
      if (validateUri()) {
        const uri = filesState.uri;
        const name = filesState.uri.split('/').pop();

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder);
        }, 3000);
      }
    } else {
      if (filesState.uri && validateUri()) {
        const uri = filesState.uri.fileUri;
        const name = filesState.uri.fileName;

        setTimeout(() => {
          uploadFile(uri, name, filesState.folderContent.currentFolder);
        }, 3000);
      }
    }

    // Set rootfoldercontent for MoveFilesModal
    parentFolderId === null ? props.dispatch(fileActions.setRootFolderContent(filesState.folderContent)) : null;

    // BackHandler
    const backAction = () => {
      if (props.filesState.folderContent && !props.filesState.folderContent.parentId) {
        count++;
        if (count < 2) {
          notify({ type: 'error', text: 'Try exiting again to close the app' });
        } else {
          BackHandler.exitApp();
        }

        // Reset if some time passes
        setTimeout(() => {
          count = 0;
        }, 4000);
      } else {
        props.dispatch(fileActions.getFolderContent(props.filesState.folderContent.parentId));
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [filesState.folderContent]);

  const uploadFile = async (uri: string, name: string, currentFolder: number) => {
    props.dispatch(fileActions.setUri(undefined));
    const userData = await getAnalyticsData();

    try {
      const token = props.authenticationState.token;
      const mnemonic = props.authenticationState.user.mnemonic;
      const headers = {
        Authorization: `Bearer ${token}`,
        'internxt-mnemonic': mnemonic,
        'Content-Type': 'multipart/form-data',
      };
      const regex = /^(.*:\/{0,2})\/?(.*)$/gm;

      analytics
        .track('file-upload-start', { userId: userData.uuid, email: userData.email, device: DevicePlatform.Mobile })
        .catch(() => undefined);
      props.dispatch(fileActions.uploadFileStart());

      const file = uri.replace(regex, '$2'); // if iOS remove file://
      const finalUri = Platform.OS === 'ios' ? RNFetchBlob.wrap(decodeURIComponent(file)) : RNFetchBlob.wrap(uri);

      RNFetchBlob.fetch(
        'POST',
        `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${currentFolder}/upload`,
        headers,
        [{ name: 'xfile', filename: name, data: finalUri }],
      )
        .uploadProgress({ count: 10 }, (sent, total) => {
          props.dispatch(fileActions.uploadFileSetProgress(sent / total));
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
            props.navigation.replace(AppScreen.OutOfSpace);
          } else if (res.respInfo.status === 201) {
            analytics
              .track('file-upload-finished', {
                userId: userData.uuid,
                email: userData.email,
                device: DevicePlatform.Mobile,
              })
              .catch(() => undefined);
            props.dispatch(fileActions.getFolderContent(filesState.folderContent.currentFolder));
          } else {
            Alert.alert('Error', 'Can not upload file');
          }

          props.dispatch(fileActions.uploadFileSetProgress(0));
          props.dispatch(fileActions.uploadFileFinished());
        })
        .catch((err) => {
          if (err.status === 401) {
            props.dispatch(userActions.signout());
          } else {
            Alert.alert('Error', 'Cannot upload file\n' + err.message);
          }

          props.dispatch(fileActions.uploadFileFailed());
          props.dispatch(fileActions.uploadFileFinished());
        });
    } catch (error) {
      analytics
        .track('file-upload-error', { userId: userData.uuid, email: userData.email, device: DevicePlatform.Mobile })
        .catch(() => undefined);
      props.dispatch(fileActions.uploadFileFailed());
      props.dispatch(fileActions.uploadFileFinished());
    }
  };

  useEffect(() => {
    const keyId = filesState.selectedItems.length > 0 && filesState.selectedItems[0].id;

    setSelectedKeyId(keyId);
  }, [filesState]);

  if (!props.authenticationState.loggedIn) {
    props.navigation.replace(AppScreen.SignIn);
  }

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
      {/* DRIVE NAV */}
      <View style={[tailwind('flex-row items-center justify-between my-2 px-5'), isRootFolder && tailwind('hidden')]}>
        <View>
          <TouchableOpacity
            disabled={!backButtonEnabled}
            onPress={() => props.dispatch(fileActions.goBack(parentFolderId?.toString()))}
          >
            <View style={[tailwind('flex-row items-center'), tailwind(!parentFolderId && 'opacity-50')]}>
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
              onPress={() => {
                if (props.layoutState.searchActive) {
                  props.dispatch(layoutActions.closeSearch());
                } else {
                  props.dispatch(layoutActions.openSearch());
                }
              }}
            >
              <Unicons.UilSearch color={getColor('blue-60')} size={22} />
            </TouchableOpacity>
          </View>
          <View style={tailwind('items-center justify-center')}>
            <TouchableOpacity
              style={tailwind('p-2')}
              onPress={() => {
                props.dispatch(layoutActions.openSettings());
              }}
            >
              <Unicons.UilEllipsisH color={getColor('blue-60')} size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScreenTitle text={screenTitle} showBackButton={false} />

      <SearchInput
        value={searchString}
        onChangeText={onSearchTextChanged}
        placeholder={strings.screens.drive.searchInThisFolder}
      />

      {/* FILE LIST ACTIONS */}
      <View style={[tailwind('flex-row justify-between mt-4 mb-2 px-5')]}>
        <TouchableWithoutFeedback
          onPress={() => {
            dispatch(layoutActions.openSortModal());
          }}
        >
          <View style={tailwind('flex-row items-center')}>
            <Text style={tailwind('text-neutral-100')}>{strings.screens.drive.sort[props.filesState.sortType]}</Text>
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
              {props.layoutState.fileViewMode === 'list' ? (
                <Unicons.UilApps size={22} color={getColor('neutral-100')} />
              ) : (
                <Unicons.UilListUl size={22} color={getColor('neutral-100')} />
              )}
            </>
          </TouchableOpacity>
        </View>
      </View>

      <Separator />

      <FileList {...props} isGrid={props.layoutState.fileViewMode === 'grid'} />
    </View>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(DriveScreen);
