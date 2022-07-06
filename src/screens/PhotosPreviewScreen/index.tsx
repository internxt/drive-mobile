import React, { useEffect, useMemo, useState } from 'react';
import RNFS from 'react-native-fs';
import { View, Text, Image, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CaretLeft, DotsThree, DownloadSimple, Link, Trash } from 'phosphor-react-native';
import { items } from '@internxt/lib';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PhotosPreviewOptionsModal from '../../components/modals/PhotosPreviewOptionsModal';
import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import strings from '../../../assets/lang/strings';
import SharePhotoModal from '../../components/modals/SharePhotoModal';
import PhotosPreviewInfoModal from '../../components/modals/PhotosPreviewInfoModal';
import { photosThunks } from '../../store/slices/photos';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getColor, tailwind } from '../../helpers/designSystem';
import AppScreen from '../../components/AppScreen';
import { RootStackScreenProps } from '../../types/navigation';
import fileSystemService from '../../services/FileSystemService';
import { PhotosCommonServices } from '../../services/photos/PhotosCommonService';
import { PhotoSizeType } from '../../types/photos';
import { Photo } from '@internxt/sdk/dist/photos';
import sentryService from '../../services/SentryService';

function PhotosPreviewScreen({ navigation, route }: RootStackScreenProps<'PhotosPreview'>): JSX.Element {
  const { data, preview } = route.params;
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
  const [showActions, setShowActions] = useState(true);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isFullSizeLoading, setIsFullSizeLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const { isDeletePhotosModalOpen, isSharePhotoModalOpen, isPhotosPreviewInfoModalOpen } = useAppSelector(
    (state) => state.ui,
  );

  const uri = isFullSizeDownloaded ? fileSystemService.pathToUri(photoPath) : preview;
  const onScreenPressed = () => {
    setShowActions(!showActions);
  };
  const onBackButtonPressed = () => navigation.goBack();
  const onShareButtonPressed = () => {
    dispatch(uiActions.setIsSharePhotoModalOpen(true));
  };
  const onDownloadButtonPressed = () => {
    fileSystemService.showFileViewer(uri, { displayName: items.getItemDisplayName(photo) });
  };
  const onMoveToTrashButtonPressed = () => {
    dispatch(uiActions.setIsDeletePhotosModalOpen(true));
  };
  const onPhotoMovedToTrash = () => {
    navigation.goBack();
  };
  const onSharePhotoModalClosed = () => dispatch(uiActions.setIsSharePhotoModalOpen(false));
  const onPhotosPreviewOptionsModalClosed = () => {
    setIsOptionsModalOpen(false);
  };
  const onPhotosPreviewInfoModalClosed = () => {
    dispatch(uiActions.setIsPhotosPreviewInfoModalOpen(false));
    setIsOptionsModalOpen(true);
  };
  const isPhotoAlreadyDownloaded = () => RNFS.exists(photoPath);
  const loadImage = () => {
    dispatch(
      photosThunks.downloadFullSizePhotoThunk({
        photo,
        onProgressUpdate: (progress) => {
          setProgress(progress);
        },
      }),
    )
      .unwrap()
      .then(() => {
        setIsFullSizeDownloaded(true);
      })
      .catch((err) => {
        sentryService.native.captureException(err);
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
        loadImage();
      }
    });
  }, []);

  return (
    <>
      {/* MODALS */}
      <PhotosPreviewOptionsModal
        isOpen={isOptionsModalOpen}
        onClosed={onPhotosPreviewOptionsModalClosed}
        data={photo}
        preview={route.params.preview}
        photoPath={photoPath}
        isFullSizeLoading={false}
      />
      <PhotosPreviewInfoModal
        isOpen={isPhotosPreviewInfoModalOpen}
        onClosed={onPhotosPreviewInfoModalClosed}
        data={photo}
        preview={route.params.preview}
      />
      <DeletePhotosModal
        isOpen={isDeletePhotosModalOpen}
        onClosed={() => dispatch(uiActions.setIsDeletePhotosModalOpen(false))}
        onPhotosDeleted={onPhotoMovedToTrash}
        data={[photo]}
      />
      <SharePhotoModal
        isOpen={isSharePhotoModalOpen}
        data={photo}
        onClosed={onSharePhotoModalClosed}
        preview={route.params.preview}
      />

      <AppScreen
        statusBarHidden
        statusBarStyle="light"
        backgroundColor={getColor('black')}
        style={{ ...tailwind('h-full') }}
      >
        {/* PHOTO */}
        <Image resizeMode={'contain'} style={tailwind('bg-black w-full h-full absolute')} source={{ uri }} />

        {/* LOADING */}
        {isFullSizeLoading && (
          <View style={tailwind('absolute top-0 bottom-0 right-0 left-0 items-center justify-center')}>
            <LoadingSpinner size={32} color={getColor('white')} />
            <Text style={tailwind('mt-2 text-white')}>{(progress * 100).toFixed(0) + '%'}</Text>
          </View>
        )}

        <TouchableWithoutFeedback onPress={onScreenPressed}>
          {showActions ? (
            <View style={tailwind('flex-col justify-between h-full')}>
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.24)', 'transparent']}
                style={{
                  ...tailwind('absolute w-full'),
                  paddingTop: safeAreaInsets.top,
                }}
              >
                <View style={tailwind('flex-row justify-between')}>
                  {/* BACK BUTTON */}
                  <TouchableOpacity style={tailwind('z-20')} onPress={onBackButtonPressed}>
                    <View style={tailwind('p-5')}>
                      <CaretLeft color={getColor('white')} size={24} weight="bold" />
                    </View>
                  </TouchableOpacity>

                  {/* OPTIONS BUTTON */}
                  <TouchableOpacity style={tailwind('z-10')} onPress={() => setIsOptionsModalOpen(true)}>
                    <View style={tailwind('p-5')}>
                      <DotsThree weight="bold" color={getColor('white')} size={24} />
                    </View>
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.24)', 'rgba(0,0,0,0.6)']}
                style={{
                  ...tailwind('flex-row justify-around p-3 absolute bottom-0 w-full'),
                  paddingBottom: safeAreaInsets.bottom,
                }}
              >
                <TouchableOpacity
                  disabled={isFullSizeLoading}
                  style={tailwind('items-center flex-1 pb-2')}
                  onPress={onShareButtonPressed}
                >
                  <Link color={!isFullSizeLoading ? 'white' : getColor('neutral-100')} size={26} />
                  <Text
                    style={[
                      tailwind('text-xs'),
                      !isFullSizeLoading ? tailwind('text-white') : tailwind('text-neutral-100'),
                    ]}
                  >
                    {strings.components.buttons.share}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isFullSizeLoading}
                  style={tailwind('items-center flex-1')}
                  onPress={onDownloadButtonPressed}
                >
                  <DownloadSimple color={!isFullSizeLoading ? 'white' : getColor('neutral-100')} size={26} />
                  <Text
                    style={[
                      tailwind('text-xs'),
                      !isFullSizeLoading ? tailwind('text-white') : tailwind('text-neutral-100'),
                    ]}
                  >
                    {strings.components.buttons.download}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={tailwind('items-center flex-1')} onPress={onMoveToTrashButtonPressed}>
                  <Trash color={getColor('white')} size={26} />
                  <Text style={tailwind('text-white text-xs')}>{strings.components.buttons.moveToThrash}</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : (
            <View style={tailwind('w-full h-full')}></View>
          )}
        </TouchableWithoutFeedback>
      </AppScreen>
    </>
  );
}

export default PhotosPreviewScreen;
