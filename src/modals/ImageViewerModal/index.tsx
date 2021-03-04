import React from 'react'
import { Modal } from 'react-native'
import ImageViewer from 'react-native-image-zoom-viewer'
import { IImageInfo } from 'react-native-image-zoom-viewer/built/image-viewer.type';

export interface IImageViewerModal {
  isOpen: boolean
  photos: IImageInfo[]
  handleClose: () => void
}

const ImageViewerModal = (props: IImageViewerModal) => {
  return (
    <Modal visible={props.isOpen} transparent={false}>
      <ImageViewer imageUrls={props.photos} onClick={props.handleClose} />
    </Modal>
  );
}

export default ImageViewerModal