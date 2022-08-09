import { Photo } from '@internxt/sdk/dist/photos';
import React from 'react';
import DeletePhotosModal from '../../components/modals/DeletePhotosModal';
import PhotosPreviewInfoModal from '../../components/modals/PhotosPreviewInfoModal';
import PhotosPreviewOptionsModal from '../../components/modals/PhotosPreviewOptionsModal';
import SharePhotoModal from '../../components/modals/SharePhotoModal';

export type PhotoPreviewModal = 'preview-options' | 'preview-info' | 'trash' | 'share';
interface PhotosPreviewScreenModalsProps {
  preview: string;
  openedModals: PhotoPreviewModal[];
  photo: Photo;
  onOpen: (modal: PhotoPreviewModal) => void;
  onClose: (modal: PhotoPreviewModal) => void;
  photoPath: string;
  onPhotoMovedToTrash: () => void;
}
export const PhotosPreviewScreenModals: React.FC<PhotosPreviewScreenModalsProps> = ({
  preview,
  openedModals,
  photo,
  photoPath,
  onClose,
  onOpen,
  onPhotoMovedToTrash,
}) => {
  const isOpen = (modal: PhotoPreviewModal) => openedModals.includes(modal);

  return (
    <>
      <PhotosPreviewOptionsModal
        onOptionPressed={onOpen}
        isOpen={isOpen('preview-options')}
        onClosed={() => onClose('preview-options')}
        data={photo}
        preview={preview}
        photoPath={photoPath}
        isFullSizeLoading={false}
      />
      <PhotosPreviewInfoModal
        isOpen={isOpen('preview-info')}
        onClosed={() => onClose('preview-info')}
        data={photo}
        preview={preview}
      />
      <DeletePhotosModal
        isOpen={isOpen('trash')}
        onClosed={() => onClose('trash')}
        onPhotosDeleted={onPhotoMovedToTrash}
        data={[photo]}
      />
      <SharePhotoModal isOpen={isOpen('share')} data={photo} onClosed={() => onClose('share')} preview={preview} />
    </>
  );
};
