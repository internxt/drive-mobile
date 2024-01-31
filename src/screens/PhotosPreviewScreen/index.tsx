import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { View, TouchableOpacity, Animated, Easing, Platform, Dimensions, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowSquareOut,
  CaretLeft,
  Cloud,
  CloudSlash,
  DotsThreeVertical,
  DownloadSimple,
  Link,
  Trash,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackScreenProps } from '../../types/navigation';
import AppScreen from '../../components/AppScreen';

import { PhotosItemBacked, PhotoSyncStatus } from '../../types/photos';

import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { PhotoPreviewModal, PhotosPreviewScreenModals } from './modals';
import AppProgressBar from 'src/components/AppProgressBar';
import AppText from 'src/components/AppText';
import strings from 'assets/lang/strings';
import { ImageViewer } from '@internxt-mobile/ui-kit';
import * as photosUseCases from '@internxt-mobile/useCases/photos';
import { GeneratingLinkModal } from 'src/components/modals/common/GeneratingLinkModal';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey, PhotosAnalyticsScreenKey } from '@internxt-mobile/services/photos/analytics';
import { PhotosContext } from 'src/contexts/Photos';
import { INCREASED_TOUCH_AREA_X2 } from 'src/styles/global';
import fileSystemService from '@internxt-mobile/services/FileSystemService';
import { VideoViewer } from 'src/components/photos/VideoViewer';
import { photosUtils } from '@internxt-mobile/services/photos/utils';
import { PhotosItemType } from '@internxt/sdk/dist/photos';
import { time } from '@internxt-mobile/services/common/time';
import errorService from '@internxt-mobile/services/ErrorService';
import { titlerize } from 'src/helpers/strings';
export interface PhotosItemActions {
  exportPhoto: () => void;
  saveToGallery: () => void;
  confirmSaveToGallery: () => void;
  copyLink: () => Promise<void>;
  shareLink: () => Promise<void>;
  moveToTrash: () => Promise<void>;
  closeModal: (modal: PhotoPreviewModal) => void;
  openModal: (modal: PhotoPreviewModal) => void;
}

let isMounted = false;
function PhotosPreviewScreen({ navigation, route }: RootStackScreenProps<'PhotosPreview'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const photosCtx = useContext(PhotosContext);
  const [showActions, setShowActions] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const fadeAnimProgress = useRef(new Animated.Value(0)).current;
  const [progressVisible, setProgressVisible] = useState(false);
  const [downloadedFullSizeUri, setDownloadedFullSizeUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: showActions ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [showActions]);

  useEffect(() => {
    Animated.timing(fadeAnimProgress, {
      toValue: progressVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [progressVisible]);

  const { photosItem } = route.params;

  const isVideo = photosItem.type === PhotosItemType.VIDEO;
  const isDownloading =
    (!downloadedFullSizeUri && photosItem.status === PhotoSyncStatus.IN_SYNC_ONLY) ||
    (photosItem.type === PhotosItemType.VIDEO && !downloadedFullSizeUri);

  const [openedModals, setOpenedModals] = useState<PhotoPreviewModal[]>([]);

  const safeAreaInsets = useSafeAreaInsets();

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    isMounted = true;
    downloadFullSizeIfNeeded();
    return () => {
      isMounted = false;
    };
  }, [photosItem]);

  const downloadFullSizeIfNeeded = async () => {
    if (downloadedFullSizeUri) return;
    if (
      photosItem.type === PhotosItemType.VIDEO &&
      photosItem.status !== PhotoSyncStatus.IN_SYNC_ONLY &&
      photosItem.localUri
    ) {
      /**
       * In order to play the video, we need a local path, so on iOS
       * we basically copy the asset to the file system, on Android
       * this is a NOOP since the item path is already a file system
       * path
       */
      const videoPath = await photosUtils.cameraRollUriToFileSystemUri({
        name: photosItem.name,
        format: photosItem.format,
        itemType: photosItem.type,
        uri: photosItem.localUri,
      });
      setDownloadedFullSizeUri(videoPath);
    }

    if (
      !photosItem ||
      photosItem.status === PhotoSyncStatus.DEVICE_AND_IN_SYNC ||
      photosItem.status === PhotoSyncStatus.IN_DEVICE_ONLY
    )
      return;
    if (isMounted) {
      setProgressVisible(true);
    }

    const destination = await photosUseCases.downloadFullSizePhotosItem({
      photosItem: photosItem as PhotosItemBacked,
      onProgressUpdate: setProgress,
    });

    if (isMounted) {
      if (destination) setDownloadedFullSizeUri(destination);

      setProgressVisible(false);
    }
  };

  const actions: PhotosItemActions = {
    openModal(modal) {
      if (!openedModals.includes(modal)) {
        setOpenedModals(openedModals.concat(modal));
      }
    },
    exportPhoto: async () => {
      if (isDownloading) return;
      photosUseCases.exportPhotosItem({ photosItemToShare: photosItem });
    },
    confirmSaveToGallery: async () => {
      await photosUseCases.saveToGallery({ photosItem: photosItem });
      actions.closeModal('confirm-save');
      actions.closeModal('preview-options');
    },
    saveToGallery: async () => {
      if (isDownloading) return;
      if (photosItem.status === PhotoSyncStatus.IN_SYNC_ONLY) {
        photosUseCases.saveToGallery({ photosItem: photosItem });
        actions.closeModal('preview-options');
      } else {
        actions.openModal('confirm-save');
      }
    },
    copyLink: async () => {
      if (generatingShareLink) return;
      if (photosItem.photoFileId) {
        setGeneratingShareLink(true);
      }
      await photosUseCases.copyPhotosItemSharedLink({
        photosItemFileId: photosItem.photoFileId as string,
        photoId: photosItem.photoId as string,
      });

      actions.closeModal('preview-options');
      setGeneratingShareLink(false);
    },
    shareLink: async () => {
      if (generatingShareLink) return;
      photos.analytics.track(PhotosAnalyticsEventKey.ShareLinkSelected);
      if (photosItem.photoFileId) {
        setGeneratingShareLink(true);
      }
      await photosUseCases.sharePhotosItemSharedLink({
        photosItemFileId: photosItem.photoFileId as string,
        photoId: photosItem.photoId as string,
        onLinkGenerated: () => {
          setGeneratingShareLink(false);
        },
      });
      actions.closeModal('preview-options');
      setGeneratingShareLink(false);
    },
    moveToTrash: async () => {
      try {
        photosUseCases.deletePhotosItems({
          photosToDelete: [photosItem as PhotosItemBacked],
        });
        if (Platform.OS != 'android') {
          await photosCtx.removePhotosItems([photosItem]);
        }

        actions.closeModal('trash');
        actions.closeModal('preview-options');

        navigation.goBack();
      } catch (error) {
        errorService.reportError(error);
      }
    },

    closeModal(modal) {
      const newModals = openedModals.filter((openModal) => openModal !== modal);
      setOpenedModals(newModals);
    },
  };
  const onBackButtonPressed = () => navigation.goBack();

  const handleThreeDotsPress = () => {
    actions.openModal('preview-options');
    photos.analytics.track(PhotosAnalyticsEventKey.ThreeDotsMenuSelected);
    photos.analytics.screen(PhotosAnalyticsScreenKey.PhotosThreeDotsMenu);
  };
  function handleTapImage() {
    setShowActions(!showActions);
  }

  function handleZoomImage() {
    setShowActions(false);
  }

  function handleImageViewReset() {
    setShowActions(true);
  }

  function renderSyncStatus() {
    const isSynced = photosItem.photoId && photosItem.photoFileId;

    return (
      <View style={tailwind('flex-row items-center opacity-80')}>
        <AppText style={tailwind('text-white')}>{time.getFormattedDate(photosItem.takenAt, 'T')}</AppText>
        <AppText bold style={tailwind('mx-2 text-white')}>
          ·
        </AppText>
        {isSynced ? (
          <Cloud size={16} color={tailwind('text-white').color as string} weight="fill" />
        ) : (
          <CloudSlash size={16} color={tailwind('text-white').color as string} weight="fill" />
        )}
        <AppText style={tailwind('text-white text-sm ml-2')}>
          {isSynced ? strings.screens.photosPreviewScreen.synced : strings.screens.photosPreviewScreen.pendingSync}
        </AppText>
      </View>
    );
  }
  function PhotoPreviewHeader() {
    return (
      <Animated.View
        pointerEvents={showActions ? 'auto' : 'none'}
        style={[
          tailwind('absolute top-0 w-full z-10'),
          {
            height: (tailwind('h-24').height as number) + safeAreaInsets.top,
            opacity: fadeAnim,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
          locations={[0, 1]}
          style={{
            ...tailwind('flex-row h-full w-full items-center'),
            paddingTop: safeAreaInsets.top,
          }}
        >
          <View style={[tailwind('flex-row justify-between w-full'), { marginBottom: safeAreaInsets.top }]}>
            <TouchableOpacity hitSlop={INCREASED_TOUCH_AREA_X2} style={tailwind('z-20')} onPress={onBackButtonPressed}>
              <View style={tailwind('p-5')}>
                <CaretLeft color={getColor('text-white')} size={28} weight="bold" />
              </View>
            </TouchableOpacity>

            <View style={[tailwind('flex-1 px-10 justify-center items-center')]}>
              <View style={tailwind('')}>
                <AppText medium style={tailwind('text-base text-white text-center')}>
                  {titlerize(time.getFormattedDate(photosItem.takenAt, 'EEE, d LLL yyyy'), false)}
                </AppText>
                {renderSyncStatus()}
              </View>

              <Animated.View style={{ opacity: fadeAnimProgress }}>
                <AppProgressBar
                  currentValue={progress}
                  totalValue={1}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', height: 3, width: '100%' }}
                  progressStyle={tailwind('bg-white')}
                />
              </Animated.View>
            </View>
            <TouchableOpacity hitSlop={INCREASED_TOUCH_AREA_X2} style={tailwind('z-10')} onPress={handleThreeDotsPress}>
              <View style={tailwind('p-5')}>
                <DotsThreeVertical weight="bold" color={getColor('text-white')} size={28} />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  function PhotoPreviewFooter() {
    return (
      <Animated.View
        pointerEvents={showActions ? 'auto' : 'none'}
        style={[
          tailwind('absolute bottom-0 w-full'),
          { height: (tailwind('h-24').height as number) + safeAreaInsets.bottom, opacity: fadeAnim },
        ]}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
          locations={[0, 1]}
          style={{
            ...tailwind('flex-row justify-around h-full items-end'),
            paddingBottom: safeAreaInsets.bottom,
          }}
        >
          <TouchableOpacity
            hitSlop={INCREASED_TOUCH_AREA_X2}
            style={tailwind('items-center flex-1 pb-5')}
            onPress={actions.shareLink}
          >
            <Link color={getColor('text-white')} size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={INCREASED_TOUCH_AREA_X2}
            style={tailwind('items-center flex-1 pb-5')}
            onPress={actions.exportPhoto}
          >
            <ArrowSquareOut color={getColor('text-white')} size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={INCREASED_TOUCH_AREA_X2}
            style={tailwind('items-center flex-1 pb-5')}
            onPress={actions.saveToGallery}
          >
            <DownloadSimple color={getColor('text-white')} size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={INCREASED_TOUCH_AREA_X2}
            style={tailwind('items-center flex-1 pb-5')}
            onPress={() => actions.openModal('trash')}
          >
            <Trash color={getColor('text-white')} size={28} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  }

  const renderVideoViewer = () => {
    if (Platform.OS === 'ios') {
      return <VideoViewer thumbnail={photosItem.localPreviewPath} source={downloadedFullSizeUri} />;
    }

    if (Platform.OS === 'android') {
      // On Android some callbacks doesn't work also there's
      // no full screen mode, so we display the video in
      // a framed view only
      // https://github.com/react-native-video/react-native-video/issues/1879

      const totalHeaderHeight = tailwind('h-24').height as number;
      const framedVideoHeight =
        Dimensions.get('window').height - (totalHeaderHeight * 2 + safeAreaInsets.top + safeAreaInsets.bottom);

      return (
        <View
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <View style={{ height: framedVideoHeight }}>
            <VideoViewer thumbnail={photosItem.localPreviewPath} source={downloadedFullSizeUri} />
          </View>
        </View>
      );
    }
  };

  const renderImageViewer = () => {
    return (
      <ImageViewer
        source={fileSystemService.pathToUri(
          downloadedFullSizeUri ? downloadedFullSizeUri : photosItem.localPreviewPath,
        )}
        onTapImage={handleTapImage}
        onZoomImage={handleZoomImage}
        onImageViewReset={handleImageViewReset}
      />
    );
  };

  return (
    <>
      <AppScreen statusBarStyle="dark" backgroundColor={getColor('text-black')} style={{ ...tailwind('h-full') }}>
        <PhotoPreviewHeader />
        {isVideo ? renderVideoViewer() : renderImageViewer()}

        <PhotoPreviewFooter />
      </AppScreen>
      <GeneratingLinkModal isGenerating={generatingShareLink} />
      <PhotosPreviewScreenModals openedModals={openedModals} photo={photosItem} actions={actions} />
    </>
  );
}

export default PhotosPreviewScreen;
