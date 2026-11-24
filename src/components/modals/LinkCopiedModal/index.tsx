import { Link } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { BaseModalProps } from '../../../types/ui';
import CenterModal from '../CenterModal';

const LinkCopiedModal = (props: BaseModalProps): JSX.Element => {
  const getColor = useGetColor();

  useEffect(() => {
    if (props.isOpen) {
      setTimeout(() => {
        props.onClose();
      }, 1000);
    }
  }, [props.isOpen]);

  return (
    <CenterModal isOpen={props.isOpen} onClosed={props.onClose}>
      <View className="p-6 w-32 h-32 justify-center items-center">
        <View className="mb-2">
          <Link size={40} color={getColor('text-gray-50')} />
        </View>
        <Text className="text-center text-supporting-2 text-gray-50">{strings.modals.LinkCopied.message}</Text>
      </View>
    </CenterModal>
  );
};

export default LinkCopiedModal;
