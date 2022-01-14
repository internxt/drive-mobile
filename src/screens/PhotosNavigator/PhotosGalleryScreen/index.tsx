import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import Portal from '@burstware/react-native-portal';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../../helpers/designSystem';
import globalStyle from '../../../styles/global.style';
import ScreenTitle from '../../../components/ScreenTitle';
import strings from '../../../../assets/lang/strings';
import galleryViews from '../../../components/gallery-views';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { photosActions, photosSelectors, photosThunks } from '../../../store/slices/photos';
import { layoutActions } from '../../../store/slices/layout';
import SharePhotoModal from '../../../components/modals/SharePhotoModal';
import DeletePhotosModal from '../../../components/modals/DeletePhotosModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GalleryViewMode } from '../../../types/photos';
import LoadingSpinner from '../../../components/LoadingSpinner';

function PhotosGalleryScreen(): JSX.Element {
  const dispatch = useAppDispatch();
  const { isSharePhotoModalOpen, isDeletePhotosModalOpen } = useAppSelector((state) => state.layout);
  const { isSyncing, syncStatus, isSelectionModeActivated, viewMode, selectedPhotos } = useAppSelector(
    (state) => state.photos,
  );
  const hasPhotos = useAppSelector(photosSelectors.hasPhotos);
  const hasNoPhotosSelected = selectedPhotos.length === 0;
  const hasManyPhotosSelected = selectedPhotos.length > 1;
  const onSharePhotoModalClosed = () => dispatch(layoutActions.setIsSharePhotoModalOpen(false));
  const onDeletePhotosModalClosed = () => dispatch(layoutActions.setIsDeletePhotosModalOpen(false));
  const onSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
  };
  const onCancelSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(false));
    dispatch(photosActions.deselectAll());
  };
  const onSelectAllButtonPressed = () => {
    dispatch(photosThunks.selectAllThunk());
  };
  const onShareSelectionButtonPressed = () => {
    dispatch(layoutActions.setIsSharePhotoModalOpen(true));
  };
  const onDownloadSelectionButtonPressed = () => {
    console.log('onDownloadSelectionButtonPressed!');
  };
  const onDeleteSelectionButtonPressed = () => {
    dispatch(layoutActions.setIsDeletePhotosModalOpen(true));
  };
  const GalleryView = galleryViews[viewMode];
  const groupByMenu = (function () {
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
  })();

  useEffect(() => {
    dispatch(photosActions.setViewMode(GalleryViewMode.All));
    dispatch(photosActions.deselectAll());
    dispatch(photosThunks.loadLocalPhotosThunk({ limit: 15, skip: 0 }));
  }, []);

  return (
    <>
      <SharePhotoModal isOpen={isSharePhotoModalOpen} data={selectedPhotos[0]} onClosed={onSharePhotoModalClosed} />
      <DeletePhotosModal isOpen={isDeletePhotosModalOpen} data={selectedPhotos} onClosed={onDeletePhotosModalClosed} />

      <View style={tailwind('app-screen bg-white flex-1')}>
        {/* GALLERY TOP BAR */}
        <View style={tailwind('pb-3 h-16')}>
          <View style={tailwind('flex-row justify-between flex-1')}>
            {isSelectionModeActivated ? (
              <>
                <View style={tailwind('flex-row items-center justify-between')}>
                  <Text style={tailwind('pl-5')}>
                    {strings.formatString(strings.screens.gallery.nPhotosSelected, selectedPhotos.length)}
                  </Text>
                </View>

                <View style={tailwind('flex-row pr-5')}>
                  <View style={tailwind('flex-row items-center justify-between')}>
                    <TouchableOpacity
                      style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl mr-2')}
                      onPress={onSelectAllButtonPressed}
                    >
                      <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                        {strings.components.buttons.selectAll}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
              </>
            ) : (
              <>
                <ScreenTitle text={strings.screens.gallery.title} showBackButton={false} />

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
              </>
            )}
          </View>

          {isSyncing && (
            <View style={tailwind('pl-5 flex-row items-center')}>
              <LoadingSpinner style={tailwind('mr-1')} />
              <Text style={tailwind('text-sm text-neutral-100')}>
                {syncStatus.totalTasks > 0
                  ? strings.formatString(
                      strings.screens.gallery.syncing,
                      syncStatus.completedTasks,
                      syncStatus.totalTasks,
                    )
                  : strings.generic.preparing}
              </Text>
            </View>
          )}
        </View>

        {/* GALLERY VIEW */}
        {hasPhotos ? (
          <GalleryView />
        ) : (
          <View style={tailwind('flex-1 items-center justify-center')}>
            <Text style={tailwind('text-lg text-neutral-60')}>{strings.screens.gallery.empty}</Text>
          </View>
        )}

        {/*  GROUP BY MENU */}
        {groupByMenu}

        {/* SELECTION MODE ACTIONS */}
        {isSelectionModeActivated && (
          <Portal>
            <SafeAreaView style={[tailwind('flex-row w-full absolute bottom-0 bg-white px-4 py-2')]}>
              <TouchableWithoutFeedback
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
                    {strings.components.buttons.shareWithLink}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback
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
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback
                style={tailwind('flex-1')}
                onPress={onDeleteSelectionButtonPressed}
                disabled={hasNoPhotosSelected}
              >
                <View style={tailwind('items-center flex-1')}>
                  <Unicons.UilTrash
                    color={hasNoPhotosSelected ? getColor('neutral-60') : getColor('red-60')}
                    size={24}
                  />
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
            </SafeAreaView>
          </Portal>
        )}
      </View>
    </>
  );
}

export default PhotosGalleryScreen;
