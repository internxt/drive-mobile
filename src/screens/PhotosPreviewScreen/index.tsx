import React, { useEffect, useMemo, useRef, useState } from 'react';
import RNFS from 'react-native-fs';
import { View, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretLeft, DotsThreeVertical, DownloadSimple, Link, Trash } from 'phosphor-react-native';
import { items } from '@internxt/lib';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import { RootStackScreenProps } from '../../types/navigation';
import AppScreen from '../../components/AppScreen';

import fileSystemService from '../../services/FileSystemService';
import { PhotosCommonServices } from '../../services/photos/PhotosCommonService';
import { PhotoSizeType } from '../../types/photos';
import { Photo } from '@internxt/sdk/dist/photos';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { PhotoPreviewModal, PhotosPreviewScreenModals } from './modals';
import AppProgressBar from 'src/components/AppProgressBar';
import AppText from 'src/components/AppText';
import strings from 'assets/lang/strings';
import { ImageViewer } from '@internxt-mobile/ui-kit';
import { errorService } from '@internxt-mobile/services/common';
function PhotosPreviewScreen({ navigation, route }: RootStackScreenProps<'PhotosPreview'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [showActions, setShowActions] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnimProgress = useRef(new Animated.Value(1)).current;
  const [progressVisible, setProgressVisible] = useState(false);
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

  const { data, preview } = route.params;
  const [openedModals, setOpenedModals] = useState<PhotoPreviewModal[]>([]);
  const photo = useMemo<Photo>(
    () => ({
      ...route.params.data,
      statusChangedAt: new Date(data.statusChangedAt),
      takenAt: new Date(data.takenAt),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    }),
    [data],
  );
  const safeAreaInsets = useSafeAreaInsets();
  const [isFullSizeDownloaded, setIsFullSizeDownloaded] = useState(false);
  const photoPath = PhotosCommonServices.getPhotoPath({
    name: photo.name,
    size: PhotoSizeType.Full,
    type: photo.type,
  });
  const dispatch = useAppDispatch();
  const [isFullSizeLoading, setIsFullSizeLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const openModal = (modal: PhotoPreviewModal) => {
    if (!openedModals.includes(modal)) {
      setOpenedModals(openedModals.concat(modal));
    }
  };

  const closeModal = (modal: PhotoPreviewModal) => {
    const newModals = openedModals.filter((openModal) => openModal !== modal);

    setOpenedModals(newModals);
  };
  const uri = isFullSizeDownloaded ? fileSystemService.pathToUri(photoPath) : preview;

  const onBackButtonPressed = () => navigation.goBack();
  const onShareButtonPressed = () => {
    openModal('share');
  };
  const onDownloadButtonPressed = () => {
    fileSystemService.showFileViewer(uri, { displayName: items.getItemDisplayName(photo) });
  };
  const onMoveToTrashButtonPressed = () => {
    openModal('trash');
  };
  const onPhotoMovedToTrash = () => {
    navigation.goBack();
  };

  const isPhotoAlreadyDownloaded = () => RNFS.exists(photoPath);
  const loadImage = () => {
    dispatch(
      photosThunks.downloadFullSizePhotoThunk({
        photo,
        onProgressUpdate: (progress) => {
          setProgress(progress);
          if (progress === 1) {
            setProgressVisible(false);
          }
        },
      }),
    )
      .unwrap()
      .then(() => {
        setIsFullSizeDownloaded(true);
      })
      .catch((err) => {
        errorService.reportError(err, {
          tags: {
            photos_step: 'DOWNLOAD_FULL_SIZE',
          },
        });
      })
      .finally(() => {
        setIsFullSizeLoading(false);
      });
  };

  useEffect(() => {
    isPhotoAlreadyDownloaded().then((isDownloaded) => {
      if (isDownloaded) {
        setIsFullSizeDownloaded(true);
        setIsFullSizeLoading(false);
      } else {
        setProgressVisible(true);
        loadImage();
      }
    });
  }, []);

  function handleTapImage() {
    setShowActions(!showActions);
  }

  function handleZoomImage() {
    setShowActions(false);
  }

  function handleImageViewReset() {
    setShowActions(true);
  }
  function PhotoPreviewHeader() {
    return (
      <Animated.View
        pointerEvents={showActions ? 'auto' : 'none'}
        style={[
          tailwind('absolute top-0 w-full z-10'),
          { height: (tailwind('h-24').height as number) + safeAreaInsets.top, opacity: fadeAnim },
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
            <TouchableOpacity style={tailwind('z-20')} onPress={onBackButtonPressed}>
              <View style={tailwind('p-5')}>
                <CaretLeft color={getColor('text-white')} size={28} weight="bold" />
              </View>
            </TouchableOpacity>

            <Animated.View
              style={[tailwind('flex-1 px-10 justify-center items-center'), { opacity: fadeAnimProgress }]}
            >
              <AppText style={tailwind('text-white text-sm mb-1.5')}>{strings.generic.downloading}</AppText>
              <AppProgressBar
                currentValue={progress}
                totalValue={1}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', height: 3, width: '100%' }}
                progressStyle={tailwind('bg-white')}
              />
            </Animated.View>
            <TouchableOpacity style={tailwind('z-10')} onPress={() => openModal('preview-options')}>
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
            disabled={isFullSizeLoading}
            style={tailwind('items-center flex-1 pb-5')}
            onPress={onShareButtonPressed}
          >
            <Link color={!isFullSizeLoading ? 'white' : getColor('text-neutral-100')} size={28} />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={isFullSizeLoading}
            style={tailwind('items-center flex-1 pb-5')}
            onPress={onDownloadButtonPressed}
          >
            <DownloadSimple color={!isFullSizeLoading ? 'white' : getColor('text-neutral-100')} size={28} />
          </TouchableOpacity>
          <TouchableOpacity style={tailwind('items-center flex-1 pb-5')} onPress={onMoveToTrashButtonPressed}>
            <Trash color={getColor('text-white')} size={28} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    );
  }
  return (
    <>
      <AppScreen
        statusBarHidden
        statusBarStyle="light"
        backgroundColor={getColor('text-black')}
        style={{ ...tailwind('h-full') }}
      >
        <PhotoPreviewHeader />
        <ImageViewer
          source={uri}
          onTapImage={handleTapImage}
          onZoomImage={handleZoomImage}
          onImageViewReset={handleImageViewReset}
        />
        <PhotoPreviewFooter />
      </AppScreen>
      <PhotosPreviewScreenModals
        onPhotoMovedToTrash={onPhotoMovedToTrash}
        openedModals={openedModals}
        onClose={closeModal}
        onOpen={openModal}
        preview={preview}
        photo={photo}
        photoPath={photoPath}
      />
    </>
  );
}

export default PhotosPreviewScreen;
