import React from 'react';
import { Platform, Text } from 'react-native';
import Modal from 'react-native-modalbox';

import { tailwind } from '../../../helpers/designSystem';

function PhotosPreviewOptionsModal({ isOpen, onClosed }: { isOpen: boolean; onClosed: () => void }): JSX.Element {
  return (
    <Modal
      position={'bottom'}
      style={tailwind('bg-transparent')}
      coverScreen={Platform.OS === 'android'}
      isOpen={isOpen}
      onClosed={onClosed}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={250}
    >
      <Text>{'Photos preview options modal'}</Text>
    </Modal>
  );
}

export default PhotosPreviewOptionsModal;
