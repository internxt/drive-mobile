import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, BackHandler } from 'react-native';
import Portal from '@burstware/react-native-portal';

import globalStyle from '../../styles/global';
import ScreenTitle from '../../components/AppScreenTitle';
import strings from '../../../assets/lang/strings';
import galleryViews from '../../components/gallery-views';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { photosActions, photosSelectors, photosThunks } from '../../store/slices/photos';
import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import PhotosSyncStatusWidget from '../../components/PhotosSyncStatusWidget';
import AppScreen from '../../components/AppScreen';
import { Trash } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import { DataProvider } from 'recyclerlistview';
import { PhotosItemBacked } from '@internxt-mobile/types/photos';
import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey, PhotosAnalyticsScreenKey } from '@internxt-mobile/services/photos/analytics';
const dataProvider = new DataProvider((r1, r2) => {
  return r1 !== r2;
});
function PhotosGalleryScreen(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const isLoading = useRef(false);

  const dispatch = useAppDispatch();
  const safeAreaInsets = useSafeAreaInsets();
  const { isSelectionModeActivated, viewMode } = useAppSelector((state) => state.photos);
  const hasPhotos = useAppSelector(photosSelectors.hasPhotos);
  const photosItems = useAppSelector(photosSelectors.getPhotosSorted);
  const hasPhotosSelected = useAppSelector(photosSelectors.hasPhotosSelected);

  const { selection } = useAppSelector((state) => state.photos);
  const [isDeletePhotosModalOpen, setIsDeletePhotosModalOpen] = useState(false);
  const [galleryDataSource, setGalleryDataSource] = useState(dataProvider.cloneWithRows([]));

  useEffect(() => {
    photos.analytics.screen(PhotosAnalyticsScreenKey.PhotosGallery, { permissions: true });
  }, []);
  useEffect(() => {
    setGalleryDataSource(galleryDataSource.cloneWithRows(photosItems));
  }, [photosItems]);

  const onSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(true));
    photos.analytics.track(PhotosAnalyticsEventKey.MultipleSelectionActivated);
  };
  const onCancelSelectButtonPressed = () => {
    dispatch(photosActions.setIsSelectionModeActivated(false));
    dispatch(photosActions.deselectAll());
  };

  const onDeleteSelectionButtonPressed = async () => {
    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashConfirmed, {
      individual_action: false,
      number_of_items: selection.length,
    });
    dispatch(photosThunks.deletePhotosThunk({ photosToDelete: selection as PhotosItemBacked[] }));
    setIsDeletePhotosModalOpen(false);
    dispatch(photosActions.setIsSelectionModeActivated(false));
  };

  const onDeleteOptionButtonPressed = () => {
    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashSelected, {
      individual_action: false,
      number_of_items: selection.length,
    });

    setIsDeletePhotosModalOpen(true);
  };

  const onCancelDeleteButtonPressed = () => {
    setIsDeletePhotosModalOpen(false);
    photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashCanceled, {
      individual_action: false,
      number_of_items: selection.length,
    });
  };
  const onBackButtonPressed = () => {
    onCancelSelectButtonPressed();

    return false;
  };
  const GalleryView = useMemo(() => galleryViews[viewMode], []);

  useEffect(() => {
    dispatch(photosThunks.startUsingPhotosThunk()).unwrap();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackButtonPressed);

    return () => {
      dispatch(photosActions.resetPhotos());
      backHandler.remove();
    };
  }, []);

  const loadPhotos = async () => {
    dispatch(photosActions.getNextPage());
  };
  async function loadNextPage() {
    if (!isLoading.current) {
      isLoading.current = true;
      await loadPhotos();
      isLoading.current = false;
    }
  }

  async function handleRefresh() {
    await dispatch(photosThunks.refreshPhotosThunk()).unwrap();
  }

  return (
    <>
      <DeletePhotosModal
        isOpen={isDeletePhotosModalOpen}
        data={selection}
        actions={{
          onClose: onCancelDeleteButtonPressed,
          onConfirm: onDeleteSelectionButtonPressed,
        }}
      />
      <AppScreen safeAreaTop style={tailwind('flex-1')}>
        {/* GALLERY TOP BAR */}
        <View style={tailwind('')}>
          {isSelectionModeActivated ? (
            <View style={tailwind('h-10 flex-row justify-between items-center')}>
              <View style={tailwind('flex-row items-center justify-between')}>
                <Text style={tailwind('pl-5')}>
                  {strings.formatString(strings.screens.gallery.nPhotosSelected, selection.length)}
                </Text>
              </View>

              <View style={tailwind('flex-row pr-5')}>
                {/*<View style={tailwind('flex-row items-center justify-between')}>
                    <TouchableOpacity
                      style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl mr-2')}
                      onPress={onSelectAllButtonPressed}
                    >
                      <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                        {strings.buttons.selectAll}
                      </Text>
                    </TouchableOpacity>
            </View>*/}
                <View style={tailwind('flex-row items-center justify-between')}>
                  <TouchableOpacity
                    style={tailwind('bg-blue-10 px-3.5 py-1 rounded-3xl')}
                    onPress={onCancelSelectButtonPressed}
                  >
                    <Text style={[tailwind('text-blue-60'), globalStyle.fontWeight.medium]}>
                      {strings.buttons.cancel}
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
                      {strings.buttons.select}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <PhotosSyncStatusWidget />
        </View>
        <View style={{ flex: 1 }}>
          {hasPhotos ? (
            <GalleryView photos={galleryDataSource} onLoadNextPage={loadNextPage} onRefresh={handleRefresh} />
          ) : (
            <View style={tailwind('flex-1 items-center justify-center')}>
              <Text style={tailwind('text-lg text-neutral-60')}>{strings.screens.gallery.loading}</Text>
            </View>
          )}
        </View>

        {/* SELECTION MODE ACTIONS */}
        {isSelectionModeActivated && (
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
                disabled={!hasPhotosSelected}
              >
                <View style={tailwind('items-center flex-1')}>
                  <Trash color={!hasPhotosSelected ? getColor('text-neutral-60') : getColor('text-red-60')} size={24} />
                  <Text
                    numberOfLines={1}
                    style={[
                      !hasPhotosSelected ? tailwind('text-neutral-60') : tailwind('text-red-60'),
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

export default PhotosGalleryScreen;
