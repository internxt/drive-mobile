import React, { useEffect, useMemo, useRef, useState } from 'react';
import RNFS from 'react-native-fs';
import { View, Image, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretLeft, DotsThreeVertical, DownloadSimple, Link, Trash } from 'phosphor-react-native';
import { items } from '@internxt/lib';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store/hooks';
import { photosThunks } from '../../store/slices/photos';
import AppScreen from '../../components/AppScreen';
import { RootStackScreenProps } from '../../types/navigation';
import fileSystemService from '../../services/FileSystemService';
import { PhotosCommonServices } from '../../services/photos/PhotosCommonService';
import { PhotoSizeType } from '../../types/photos';
import { Photo } from '@internxt/sdk/dist/photos';
import sentryService from '../../services/SentryService';
import { useTailwind } from 'tailwind-rn';
import useGetColor from 'src/hooks/useColor';
import { PhotoPreviewModal, PhotosPreviewScreenModals } from './modals';
import AppProgressBar from 'src/components/AppProgressBar';
import AppText from 'src/components/AppText';
import strings from 'assets/lang/strings';
import errorService from 'src/services/ErrorService';

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

  function PhotoPreviewHeader() {
    return (
      <View
        style={[
          tailwind('absolute top-0 w-full'),
          { height: (tailwind('h-24').height as number) + safeAreaInsets.top },
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
      </View>
    );
  }

  function PhotoPreviewFooter() {
    return (
      <View
        style={[
          tailwind('absolute bottom-0 w-full'),
          { height: (tailwind('h-24').height as number) + safeAreaInsets.bottom },
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
      </View>
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
        <TouchableWithoutFeedback
          onPress={() => {
            setShowActions(!showActions);
          }}
        >
          <Animated.View style={[tailwind('absolute z-10 w-full h-full'), { opacity: fadeAnim }]}>
            <PhotoPreviewHeader />
            <PhotoPreviewFooter />
          </Animated.View>
        </TouchableWithoutFeedback>
        <Image resizeMode={'contain'} style={tailwind('bg-black w-full h-full')} source={{ uri }} />
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
