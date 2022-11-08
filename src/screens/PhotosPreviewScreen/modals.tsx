import photos from '@internxt-mobile/services/photos';
import { PhotosAnalyticsEventKey } from '@internxt-mobile/services/photos/analytics';
import { PhotosItem } from '@internxt-mobile/types/photos';
import React, { useEffect, useState } from 'react';
import { ConfirmSavePhotoModal } from 'src/components/modals/photos/ConfirmSavePhotoModal';
import { PhotosItemActions } from '.';
import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import PhotosPreviewInfoModal from '../../components/modals/PhotosPreviewInfoModal';
import { PhotosPreviewOptionsModal } from '../../components/modals/PhotosPreviewOptionsModal';

export type PhotoPreviewModal = 'preview-options' | 'preview-info' | 'trash' | 'confirm-save';
interface PhotosPreviewScreenModalsProps {
  openedModals: PhotoPreviewModal[];
  photo: PhotosItem;
  actions: PhotosItemActions;
}
export const PhotosPreviewScreenModals: React.FC<PhotosPreviewScreenModalsProps> = ({
  openedModals,
  photo,
  actions,
}) => {
  const [size, setSize] = useState(0);
  const isOpen = (modal: PhotoPreviewModal) => openedModals.includes(modal);
  useEffect(() => {
    photo.getSize().then(setSize);
  }, [photo.name]);
  return (
    <>
      <PhotosPreviewOptionsModal size={size} actions={actions} isOpen={isOpen('preview-options')} data={photo} />
      <PhotosPreviewInfoModal size={size} isOpen={isOpen('preview-info')} data={photo} actions={actions} />
      <ConfirmSavePhotoModal
        isOpen={isOpen('confirm-save')}
        actions={{
          onConfirm: actions.confirmSaveToGallery,
          onClose: () => actions.closeModal('confirm-save'),
        }}
        data={photo}
      />
      <DeletePhotosModal
        isOpen={isOpen('trash')}
        actions={{
          onConfirm: actions.moveToTrash,
          onClose: () => {
            photos.analytics.track(PhotosAnalyticsEventKey.MoveToTrashCanceled, {
              individual_action: true,
              number_of_items: 1,
            });
            actions.closeModal('trash');
          },
        }}
        data={[photo]}
      />
    </>
  );
};
