import { useHardwareBackPress } from '@internxt-mobile/hooks/common';
import { useDrive } from '@internxt-mobile/hooks/drive';
import { SharedScreenProps, SharedStackParamList } from '@internxt-mobile/types/navigation';
import { RouteProp, useRoute } from '@react-navigation/native';
import _ from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import ScreenTitle from '../../../components/AppScreenTitle';
import DriveItemSkinSkeleton from '../../../components/DriveItemSkinSkeleton';
import useGetColor from '../../../hooks/useColor';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAppSelector } from '../../../store/hooks';
import { SharedDriveItem } from '../SharedScreen/SharedDriveItem';
import { SharedFolderRouteParams } from '../SharedScreen/sharedNavigation';
import { DriveFolderEmpty } from '../DriveFolderScreen/DriveFolderEmpty';
import { DriveFolderError } from '../DriveFolderScreen/DriveFolderError';
import { buildSharedFolderItems, isCloseToScrollEnd, loadSharedFolderContent } from './sharedFolderContent';

export const SharedFolderScreen: React.FC<SharedScreenProps<'SharedFolder'>> = ({ navigation }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  useLanguage();
  const route = useRoute<RouteProp<SharedStackParamList, 'SharedFolder'>>();
  const { folderUuid, folderName } = route.params;
  const driveCtx = useDrive();
  const { user } = useAppSelector((state) => state.auth);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const folder = driveCtx.driveFoldersTree[folderUuid];
  const isLoading = folder?.loading ?? true;
  const hasError = Boolean(folder?.error);

  const items = useMemo(() => buildSharedFolderItems(folder, user?.bucket), [folder?.files, folder?.folders, user?.bucket]);

  useEffect(() => {
    loadSharedFolderContent(driveCtx, folderUuid);
  }, [folderUuid]);

  const onBackButtonPressed = () => {
    navigation.goBack();
  };

  useHardwareBackPress(onBackButtonPressed);

  const navigateToSharedFolder = (params: SharedFolderRouteParams) => {
    navigation.push('SharedFolder', params);
  };

  const handleScroll = async (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isLoadingMore || isLoading || !items.length || !isCloseToScrollEnd(event.nativeEvent)) return;

    setIsLoadingMore(true);
    await loadSharedFolderContent(driveCtx, folderUuid, { resetPagination: false });
    setIsLoadingMore(false);
  };

  const renderContent = () => {
    if (hasError) {
      return (
        <View style={tailwind('flex-1 flex justify-center px-8')}>
          <DriveFolderError
            error={{
              title: strings.errors.driveFolderContent.title,
              message: strings.errors.driveFolderContent.message,
            }}
            tryAgainLabel={strings.buttons.tryAgain}
            onTryAgain={() => loadSharedFolderContent(driveCtx, folderUuid)}
          />
        </View>
      );
    }

    if (isLoading && !items.length) {
      return (
        <View>
          {_.times(20, (n) => (
            <DriveItemSkinSkeleton key={n} />
          ))}
        </View>
      );
    }

    if (!items.length) {
      return (
        <View style={tailwind('flex-1 flex justify-center px-8')}>
          <DriveFolderEmpty
            title={strings.screens.drive.emptyFolder.title}
            message={strings.screens.drive.emptyFolder.message}
          />
        </View>
      );
    }

    return items.map((item) => (
      <SharedDriveItem
        key={item.uuid}
        data={item}
        navigateToSharedFolder={navigateToSharedFolder}
        parentFolderName={folderName}
      />
    ));
  };

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <ScreenTitle text={folderName ?? folder?.name ?? ''} showBackButton onBackButtonPressed={onBackButtonPressed} />
      <View style={[tailwind('flex-1'), { backgroundColor: getColor('bg-surface') }]}>
        <ScrollView
          contentContainerStyle={tailwind('flex-grow')}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </AppScreen>
  );
};
