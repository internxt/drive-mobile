import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, BackHandler } from 'react-native';
import Portal from '@burstware/react-native-portal';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles';
import ScreenTitle from '../../components/AppScreenTitle';
import strings from '../../../assets/lang/strings';
import galleryViews from '../../components/gallery-views';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import { uiActions } from '../../store/slices/ui';
import SharePhotoModal from '../../components/modals/SharePhotoModal';
import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import { GalleryViewMode } from '../../types/photos';
import PhotosSyncStatusWidget from '../../components/PhotosSyncStatusWidget';
import AppScreen from '../../components/AppScreen';
import { Trash } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function PhotosGalleryScreen(): JSX.Element {
  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const getPhotoPreview = useAppSelector(photosSelectors.getPhotoPreview);
  const { isSharePhotoModalOpen, isDeletePhotosModalOpen } = useAppSelector((state) => state.ui);
  const isLoading = useAppSelector(photosSelectors.isLoading);
  const { isSelectionModeActivated, viewMode, selectedPhotos } = useAppSelector((state) => state.photos);
  const hasPhotos = useAppSelector(photosSelectors.hasPhotos);
  const hasNoPhotosSelected = selectedPhotos.length === 0;
  const onSharePhotoModalClosed = () => dispatch(uiActions.setIsSharePhotoModalOpen(false));
  const onDeletePhotosModalClosed = () => dispatch(uiActions.setIsDeletePhotosModalOpen(false));
  const onSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
  };
  const onCancelSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(false));
    dispatch(photosActions.deselectAll());
  };
  /* const onSelectAllButtonPressed = () => {
    dispatch(photosThunks.selectAllThunk());
  };
  const onShareSelectionButtonPressed = () => {
    dispatch(uiActions.setIsSharePhotoModalOpen(true));
  };
  const onDownloadSelectionButtonPressed = () => undefined; */
  const onDeleteSelectionButtonPressed = () => {
    dispatch(uiActions.setIsDeletePhotosModalOpen(true));
  };
  const onBackButtonPressed = () => {
    onCancelSelectButtonPressed();

    return false;
  };
  const GalleryView = galleryViews[viewMode];
  /*const groupByMenu = (function () {
    const groupByItems = Object.entries(GalleryViewMode).map(([, value]) => {
      const isActive = value === viewMode;

      return (
        <TouchableWithoutFeedback key={value} onPress={() => dispatch(photosActions.setViewMode(value))}>
          <View style={[tailwind('flex-1 rounded-2xl'), isActive && tailwind('bg-neutral-70')]}>
            <Text style={[tailwind('text-neutral-500 text-center text-base'), isActive && tailwind('text-white')]}>
              {strings.screens.gallery.groupBy[value]}
            </Text>
          </View>
        </TouchableWithoutFeedback>
      );
    });

    return (
      <View style={tailwind('absolute bottom-3 px-5 w-full')}>
        <View style={tailwind('px-1 py-1 flex-row bg-neutral-20 rounded-2xl')}>{groupByItems}</View>
      </View>
    );
  })();*/

  useEffect(() => {
    //dispatch(photosActions.setViewMode(GalleryViewMode.All));
    dispatch(photosActions.resetPhotos());
    dispatch(photosThunks.loadLocalPhotosThunk());

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackButtonPressed);

    return () => {
      dispatch(photosActions.resetPhotos());
      backHandler.remove();
    };
  }, []);

  return (
    <>
      <SharePhotoModal
        isOpen={isSharePhotoModalOpen}
        data={selectedPhotos[0]}
        preview={hasNoPhotosSelected ? '' : getPhotoPreview(selectedPhotos[0])}
        onClosed={onSharePhotoModalClosed}
      />
      <DeletePhotosModal isOpen={isDeletePhotosModalOpen} data={selectedPhotos} onClosed={onDeletePhotosModalClosed} />

      <AppScreen safeAreaTop style={tailwind('mb-14')}>
        {/* GALLERY TOP BAR */}
        <View style={tailwind('pt-1.5 pb-2')}>
          {isSelectionModeActivated ? (
            <View style={tailwind('h-10 flex-row justify-between items-center')}>
              <View style={tailwind('flex-row items-center justify-between')}>
                <Text style={tailwind('pl-5')}>
                  {strings.formatString(strings.screens.gallery.nPhotosSelected, selectedPhotos.length)}
                </Text>
              </View>

              <View style={tailwind('flex-row pr-5')}>
                {/*<View style={tailwind('flex-row items-center justify-between')}>
                    <TouchableOpacity
                      style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl mr-2')}
                      onPress={onSelectAllButtonPressed}
                    >
                      <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                        {strings.components.buttons.selectAll}
                      </Text>
                    </TouchableOpacity>
            </View>*/}
                <View style={tailwind('flex-row items-center justify-between')}>
                  <TouchableOpacity
                    style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl')}
                    onPress={onCancelSelectButtonPressed}
                  >
                    <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                      {strings.components.buttons.cancel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={tailwind('h-10 flex-row justify-between')}>
              <ScreenTitle
                text={strings.screens.gallery.title}
                showBackButton={false}
                containerStyle={tailwind('py-0')}
              />

              {hasPhotos && (
                <View style={tailwind('flex-row items-center justify-between pr-5')}>
                  <TouchableOpacity
                    style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl')}
                    onPress={onSelectButtonPressed}
                    disabled={!hasPhotos}
                  >
                    <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                      {strings.components.buttons.select}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <PhotosSyncStatusWidget />
        </View>

        {/* GALLERY VIEW */}
        {hasPhotos ? (
          <GalleryView />
        ) : (
          <View style={tailwind('flex-1 items-center justify-center')}>
            <Text style={tailwind('text-lg text-neutral-60')}>
              {isLoading ? strings.screens.gallery.loading : strings.screens.gallery.empty}
            </Text>
          </View>
        )}

        {/*  VIEW MODE MENU */}
        {/* groupByMenu */}

        {/* SELECTION MODE ACTIONS */}
        {isSelectionModeActivated && (
          <Portal>
            <View
              style={[
                tailwind('flex-row w-full absolute bottom-0 bg-white px-4 py-2'),
                { marginBottom: safeAreaInsets.bottom },
              ]}
            >
              {/*<TouchableWithoutFeedback
                onPress={onShareSelectionButtonPressed}
                disabled={hasNoPhotosSelected || hasManyPhotosSelected}
              >
                <View style={tailwind('items-center flex-1')}>
                  <Unicons.UilLink
                    color={hasNoPhotosSelected || hasManyPhotosSelected ? getColor('neutral-60') : getColor('blue-60')}
                    size={24}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      hasNoPhotosSelected || hasManyPhotosSelected
                        ? tailwind('text-neutral-60')
                        : tailwind('text-blue-60'),
                      tailwind('text-xs'),
                    ]}
                  >
                    {strings.components.buttons.share}
                  </Text>
                </View>
                  </TouchableWithoutFeedback>*/}
              {/*<TouchableWithoutFeedback
                style={tailwind('flex-1')}
                onPress={onDownloadSelectionButtonPressed}
                disabled={hasNoPhotosSelected}
              >
                <View style={tailwind('items-center flex-1')}>
                  <Unicons.UilDownloadAlt
                    color={hasNoPhotosSelected ? getColor('neutral-60') : getColor('blue-60')}
                    size={24}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      hasNoPhotosSelected ? tailwind('text-neutral-60') : tailwind('text-blue-60'),
                      tailwind('text-xs'),
                    ]}
                  >
                    {strings.components.buttons.download}
                  </Text>
                </View>
                  </TouchableWithoutFeedback>*/}
              <TouchableWithoutFeedback
                style={tailwind('flex-1')}
                onPress={onDeleteSelectionButtonPressed}
                disabled={hasNoPhotosSelected}
              >
                <View style={tailwind('items-center flex-1')}>
                  <Trash color={hasNoPhotosSelected ? getColor('neutral-60') : getColor('red-60')} size={24} />
                  <Text
                    numberOfLines={1}
                    style={[
                      hasNoPhotosSelected ? tailwind('text-neutral-60') : tailwind('text-red-60'),
                      tailwind('text-xs'),
                    ]}
                  >
                    {strings.components.buttons.moveToThrash}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </Portal>
        )}
      </AppScreen>
    </>
  );
}

export default PhotosGalleryScreen;
