import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, BackHandler } from 'react-native';
import Portal from '@burstware/react-native-portal';

import globalStyle from '../../styles/global';
import ScreenTitle from '../../components/AppScreenTitle';
import strings from '../../../assets/lang/strings';

import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import PhotosSyncStatusWidget from '../../components/PhotosSyncStatusWidget';
import AppScreen from '../../components/AppScreen';
import { Trash } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { PhotosItemBacked } from '@internxt-mobile/types/photos';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey, PhotosAnalyticsScreenKey } from '@internxt-mobile/services/photos/analytics';
import { PhotosContext } from 'src/contexts/Photos/Photos.context';
import GalleryAllView, { GalleryAllSkeleton } from 'src/components/gallery-views/GalleryAllView';
import * as photosUseCases from '@internxt-mobile/useCases/photos';
import AppText from 'src/components/AppText';
import { ENABLE_PHOTOS_SYNC } from '@internxt-mobile/services/photos/constants';
function PhotosGalleryiOSScreen(): JSX.Element {
  const photosCtx = useContext(PhotosContext);
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const safeAreaInsets = useSafeAreaInsets();

  const [isDeletePhotosModalOpen, setIsDeletePhotosModalOpen] = useState(false);

  useEffect(() => {
    photos.analytics.screen(PhotosAnalyticsScreenKey.PhotosGallery, { permissions: true });
    return () => {
      photosCtx.selection.resetSelectionMode();
    };
  }, []);

  const onSelectButtonPressed = () => {
    photos.analytics.track(PhotosAnalyticsEventKey.MultipleSelectionActivated);
    photosCtx.selection.setSelectionModeActivated(true);
  };
  const onCancelSelectButtonPressed = () => {
    photosCtx.selection.resetSelectionMode();
  };

  const onDeleteSelectionButtonPressed = async () => {
    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashConfirmed, {
      individual_action: false,
      number_of_items: photosCtx.selection.selectedPhotosItems.length,
    });

    photosUseCases.deletePhotosItems({
      photosToDelete: photosCtx.selection.selectedPhotosItems as PhotosItemBacked[],
    });
    setIsDeletePhotosModalOpen(false);
    await photosCtx.removePhotosItems(photosCtx.selection.selectedPhotosItems);
    photosCtx.selection.resetSelectionMode();
  };

  const onDeleteOptionButtonPressed = () => {
    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashSelected, {
      individual_action: false,
      number_of_items: photosCtx.selection.selectedPhotosItems.length,
    });

    setIsDeletePhotosModalOpen(true);
  };

  const onCancelDeleteButtonPressed = () => {
    setIsDeletePhotosModalOpen(false);
    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashCanceled, {
      individual_action: false,
      number_of_items: photosCtx.selection.selectedPhotosItems.length,
    });
  };
  const onBackButtonPressed = () => {
    onCancelSelectButtonPressed();

    return false;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackButtonPressed);

    return () => {
      backHandler.remove();
    };
  }, []);

  async function handleRefresh() {
    await photosCtx.refresh();
  }

  const hasPhotosSelected = photosCtx.selection.selectedPhotosItems.length ? true : false;
  return (
    <>
      <DeletePhotosModal
        isOpen={isDeletePhotosModalOpen}
        data={photosCtx.selection.selectedPhotosItems}
        actions={{
          onClose: onCancelDeleteButtonPressed,
          onConfirm: onDeleteSelectionButtonPressed,
        }}
      />
      <AppScreen safeAreaTop style={tailwind('flex-1')}>
        {/* GALLERY TOP BAR */}
        <View style={tailwind('')}>
          {photosCtx.selection.selectionModeActivated ? (
            <View style={tailwind('h-10 flex-row justify-between items-center')}>
              <View style={tailwind('flex-row items-center justify-between')}>
                <AppText style={tailwind('pl-5')}>
                  {strings.formatString(
                    strings.screens.gallery.nPhotosSelected,
                    photosCtx.selection.selectedPhotosItems.length,
                  )}
                </AppText>
              </View>

              <View style={tailwind('flex-row pr-5')}>
                <View style={tailwind('flex-row items-center justify-between')}>
                  <TouchableOpacity
                    style={tailwind('bg-primary/10 px-3.5 py-1 rounded-3xl')}
                    onPress={onCancelSelectButtonPressed}
                  >
                    <Text style={[tailwind('text-primary'), globalStyle.fontWeight.medium]}>
                      {strings.buttons.cancel}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={tailwind('h-10 flex-row justify-between mb-4')}>
              <ScreenTitle
                text={strings.screens.gallery.title}
                showBackButton={false}
                containerStyle={tailwind('py-0')}
              />

              {photosCtx.ready && (
                <View style={tailwind('flex-row items-center justify-between pr-5')}>
                  <TouchableOpacity
                    style={tailwind('bg-primary/10 px-3.5 py-1 rounded-3xl')}
                    onPress={onSelectButtonPressed}
                  >
                    <Text style={[tailwind('text-primary'), globalStyle.fontWeight.medium]}>
                      {strings.buttons.select}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {ENABLE_PHOTOS_SYNC ? (
            <View style={tailwind('h-10')}>
              <PhotosSyncStatusWidget />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>
          {photosCtx.photos.length >= 1 ? (
            <GalleryAllView photos={photosCtx.photos} onRefresh={handleRefresh} />
          ) : (
            <View style={tailwind('flex-1 items-center justify-center')}>
              <AppText>Photos is no longer available.</AppText>
            </View>
          )}
        </View>

        {/* SELECTION MODE ACTIONS */}
        {photosCtx.selection.selectionModeActivated && (
          <Portal>
            <View
              style={[
                tailwind('flex-row w-full absolute bottom-0 bg-white px-4 py-2'),
                { marginBottom: safeAreaInsets.bottom },
              ]}
            >
              <TouchableWithoutFeedback
                style={tailwind('flex-1')}
                onPress={onDeleteOptionButtonPressed}
                disabled={!photosCtx.selection.selectedPhotosItems.length}
              >
                <View style={tailwind('items-center flex-1')}>
                  <Trash color={!hasPhotosSelected ? getColor('text-gray-40') : getColor('text-red-dark')} size={24} />
                  <Text
                    numberOfLines={1}
                    style={[
                      !hasPhotosSelected ? tailwind('text-gray-40') : tailwind('text-red-dark'),
                      tailwind('text-xs'),
                    ]}
                  >
                    {strings.buttons.moveToThrash}
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

export default PhotosGalleryiOSScreen;
