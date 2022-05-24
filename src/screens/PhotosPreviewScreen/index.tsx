import React, { useEffect, useState } from 'react';
import RNFS from 'react-native-fs';
import { View, Text, Image, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Photo } from '@internxt/sdk/dist/photos';
import { CaretLeft, DotsThree, DownloadSimple, Link, Trash } from 'phosphor-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { items } from '@internxt/lib';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PhotosPreviewOptionsModal from '../../components/modals/PhotosPreviewOptionsModal';
import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uiActions } from '../../store/slices/ui';
import strings from '../../../assets/lang/strings';
import SharePhotoModal from '../../components/modals/SharePhotoModal';
import { pathToUri, showFileViewer } from '../../services/fileSystem';
import PhotosPreviewInfoModal from '../../components/modals/PhotosPreviewInfoModal';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getColor, tailwind } from '../../helpers/designSystem';
import AppScreen from '../../components/AppScreen';

interface PreviewProps {
  route: {
    params: {
      data: Photo;
      preview: string;
    };
  };
}

function PhotosPreviewScreen(props: PreviewProps): JSX.Element {
  const { data: photo, preview } = props.route.params;
  const safeAreaInsets = useSafeAreaInsets();
  const photosDirectory = useAppSelector(photosSelectors.photosDirectory);
  const photoPath = photosDirectory + '/' + items.getItemDisplayName({ name: photo.id, type: photo.type });
  const dispatch = useAppDispatch();
  const [showActions, setShowActions] = useState(true);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const isFullSizeLoading = useAppSelector(photosSelectors.isPhotoDownloading)(photo.fileId);
  const progress = useAppSelector(photosSelectors.getDownloadingPhotoProgress)(photo.fileId);
  const { isDeletePhotosModalOpen, isSharePhotoModalOpen, isPhotosPreviewInfoModalOpen } = useAppSelector(
    (state) => state.ui,
  );
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const isFullSizeDownloaded = useAppSelector(photosSelectors.isPhotoDownloaded)(photo.fileId);
  const uri = isFullSizeDownloaded ? pathToUri(photoPath) : preview;
  const onScreenPressed = () => {
    setShowActions(!showActions);
  };
  const onBackButtonPressed = () => navigation.goBack();
  const onShareButtonPressed = () => {
    dispatch(uiActions.setIsSharePhotoModalOpen(true));
  };
  const onDownloadButtonPressed = () => {
    showFileViewer(uri, { displayName: items.getItemDisplayName(photo) });
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
      photosThunks.downloadPhotoThunk({
        fileId: props.route.params.data.fileId,
        options: {
          toPath: photoPath,
        },
      }),
    )
      .unwrap()
      .then((photoPath: string) => {
        dispatch(photosActions.pushDownloadedPhoto({ fileId: photo.fileId, path: photoPath }));
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    isPhotoAlreadyDownloaded().then((isDownloaded) => {
      if (isDownloaded) {
        dispatch(photosActions.pushDownloadedPhoto({ fileId: photo.fileId, path: photoPath }));
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
        data={props.route.params.data}
        preview={props.route.params.preview}
        photoPath={photoPath}
        isFullSizeLoading={isFullSizeLoading}
      />
      <PhotosPreviewInfoModal
        isOpen={isPhotosPreviewInfoModalOpen}
        onClosed={onPhotosPreviewInfoModalClosed}
        data={props.route.params.data}
        preview={props.route.params.preview}
      />
      <DeletePhotosModal
        isOpen={isDeletePhotosModalOpen}
        onClosed={() => dispatch(uiActions.setIsDeletePhotosModalOpen(false))}
        onPhotosDeleted={onPhotoMovedToTrash}
        data={[props.route.params.data]}
      />
      <SharePhotoModal
        isOpen={isSharePhotoModalOpen}
        data={props.route.params.data}
        onClosed={onSharePhotoModalClosed}
        preview={props.route.params.preview}
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
