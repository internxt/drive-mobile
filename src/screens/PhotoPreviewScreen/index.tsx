import { useNavigation } from '@react-navigation/native';
import strings from 'assets/lang/strings';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { ConfirmModal } from 'src/components/modals/ConfirmModal/ConfirmModal';
import { logger } from 'src/services/common';
import { useAppDispatch } from 'src/store/hooks';
import { runUploadThunk } from 'src/store/slices/photos';
import { RootStackScreenProps } from 'src/types/navigation';
import { useTailwind } from 'tailwind-rn';
import MoreActionsBottomSheet from '../PhotosScreen/components/MoreActionsBottomSheet';
import { usePhotoActionHandlers } from '../PhotosScreen/hooks/usePhotoActionHandlers';
import { isItemBacked } from '../PhotosScreen/utils/photoUtils';
import { BurstIncompleteBanner } from './components/BurstIncompleteBanner';
import { MetadataPanel } from './components/MetadataPanel';
import { PreviewCarousel } from './components/PreviewCarousel';
import { PreviewHeader } from './components/PreviewHeader';
import { PreviewPager } from './components/PreviewPager';
import { usePreviewItems } from './hooks/usePreviewItems';

type Props = RootStackScreenProps<'PhotoPreview'>;

export const PhotoPreviewScreen = ({ route }: Props): JSX.Element => {
  const { initialId, items: routeItems, onItemChanged, onCurrentItemChange } = route.params;
  const { items, currentIndex, setCurrentIndex } = usePreviewItems(initialId, routeItems);
  const tailwind = useTailwind();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();

  const [isUiVisible, setIsUiVisible] = useState(true);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [zoomActive, setZoomActive] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [hasVideoStarted, setHasVideoStarted] = useState(false);
  const [videoResetKey, setVideoResetKey] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const resetVideoPlayer = useCallback(() => setVideoResetKey((key) => key + 1), []);

  const handleTap = useCallback(() => {
    setIsUiVisible((visible) => !visible);
  }, []);

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setZoomActive(zoomed);
    if (zoomed) {
      setIsUiVisible(false);
    }
  }, []);

  const handleSwipeDown = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const exitVideoMode = useCallback(() => {
    setHasVideoStarted(false);
    resetVideoPlayer();
    setIsUiVisible(true);
  }, [resetVideoPlayer]);

  const closePreviewScreen = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    if (hasVideoStarted) {
      exitVideoMode();
    } else {
      closePreviewScreen();
    }
  }, [hasVideoStarted, exitVideoMode, closePreviewScreen]);

  const handleVideoPlay = useCallback(() => {
    setHasVideoStarted(true);
    setIsUiVisible(false);
  }, []);

  const handleVideoPause = useCallback(() => {
    setIsUiVisible(true);
  }, []);

  const handleVideoEnd = useCallback(() => {
    setHasVideoStarted(false);
    setIsUiVisible(true);
  }, []);

  const handleScrubStart = useCallback(() => setIsScrubbing(true), []);
  const handleScrubEnd = useCallback(() => setIsScrubbing(false), []);

  const currentItem = items[currentIndex];
  const actionItems = useMemo(() => (currentItem ? [currentItem] : []), [currentItem]);

  useEffect(() => {
    if (currentItem) {
      onCurrentItemChange?.(currentItem.id);
    }
  }, [currentIndex, currentItem, onCurrentItemChange]);

  const { handleExport, handleSave, handleCopy, handleTrashConfirm, handleRestore } = usePhotoActionHandlers({
    items: actionItems,
    onActionEnd: useCallback(() => setIsMoreActionsOpen(false), []),
    onAfterSave: useCallback(async () => {
      await onItemChanged?.();
    }, [onItemChanged]),
    onAfterTrash: useCallback(async () => {
      await onItemChanged?.();
      navigation.goBack();
    }, [onItemChanged, navigation]),
    onAfterRestore: useCallback(async () => {
      await dispatch(runUploadThunk({ bypassEnabled: true })).unwrap();
    }, [dispatch]),
  });

  const handleDeletePress = useCallback(() => setIsDeleteConfirmOpen(true), []);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleteConfirmOpen(false);
    await handleTrashConfirm();
  }, [handleTrashConfirm]);

  const showCarousel = isUiVisible && !zoomActive && !hasVideoStarted;
  const isSynced = currentItem ? isItemBacked(currentItem) : false;
  const isBurstIncomplete = currentItem?.type === 'local' && currentItem?.isBurstUploadIncomplete === true;

  return (
    <View style={tailwind('flex-1 bg-black')}>
      <StatusBar hidden />
      <PreviewPager
        items={items}
        initialIndex={currentIndex}
        activeIndex={currentIndex}
        isScrubbing={isScrubbing}
        onIndexChange={setCurrentIndex}
        onTap={handleTap}
        onZoomChange={handleZoomChange}
        onSwipeDown={handleSwipeDown}
        onVideoPlay={handleVideoPlay}
        onVideoPause={handleVideoPause}
        onVideoEnd={handleVideoEnd}
        videoResetKey={videoResetKey}
        hasVideoStarted={hasVideoStarted}
      />
      <PreviewHeader
        visible={isUiVisible}
        item={currentItem}
        onClose={handleClose}
        onMore={() => setIsMoreActionsOpen(true)}
      />
      {showCarousel && (
        <PreviewCarousel
          items={items}
          currentIndex={currentIndex}
          onPress={setCurrentIndex}
          onScrub={setCurrentIndex}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          visible={isUiVisible}
          onExport={handleExport}
          onMore={() => setIsMoreActionsOpen(true)}
          onDelete={handleDeletePress}
          isSynced={isSynced}
        />
      )}
      <BurstIncompleteBanner visible={isUiVisible && isBurstIncomplete} />
      {metadataOpen && currentItem && <MetadataPanel item={currentItem} onClose={() => setMetadataOpen(false)} />}
      <MoreActionsBottomSheet
        isOpen={isMoreActionsOpen}
        selectedItems={actionItems}
        onClose={() => setIsMoreActionsOpen(false)}
        onInfo={() => {
          setIsMoreActionsOpen(false);
          setMetadataOpen(true);
        }}
        onExport={handleExport}
        onCopy={handleCopy}
        onSave={handleSave}
        onFavorite={() => {
          logger.info('[PhotoPreview] Favorite: not implemented');
          setIsMoreActionsOpen(false);
        }}
        onTrash={handleDeletePress}
        onRestore={handleRestore}
      />
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title={strings.screens.photos.selection.deleteModal.title(1)}
        message={strings.screens.photos.selection.deleteModal.message(1)}
        confirmLabel={strings.screens.photos.selection.deleteModal.confirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        type="confirm-danger"
      />
    </View>
  );
};
