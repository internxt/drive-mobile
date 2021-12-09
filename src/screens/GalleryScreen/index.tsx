import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';

import { tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';
import { GalleryViewMode } from '../../types';
import ScreenTitle from '../../components/ScreenTitle';
import strings from '../../../assets/lang/strings';
import galleryViews from '../../components/gallery-views';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosThunks } from '../../store/slices/photos';

function GalleryScreen(): JSX.Element {
  const dispatch = useAppDispatch();
  const { isSelectionModeActivated, viewMode, selectedPhotos } = useAppSelector((state) => state.photos);
  const onSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
  };
  const onCancelSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(false));
    dispatch(photosActions.deselectAll());
  };
  const onSelectAllButtonPressed = () => {
    dispatch(photosActions.selectAll());
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
    dispatch(photosThunks.loadLocalPhotosThunk({}));
  }, []);

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
      {/* GALLERY TOP BAR */}
      <View style={tailwind('flex-row justify-between pb-3 h-16')}>
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

            <View style={tailwind('flex-row items-center justify-between pr-5')}>
              <TouchableOpacity style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl')} onPress={onSelectButtonPressed}>
                <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                  {strings.components.buttons.select}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* GALLERY VIEW */}
      <GalleryView />

      {/*  GROUP BY MENU */}
      {groupByMenu}
    </View>
  );
}

export default GalleryScreen;
