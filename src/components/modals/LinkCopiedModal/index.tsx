import { Link } from 'phosphor-react-native';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { BaseModalProps } from '../../../types/ui';
import CenterModal from '../CenterModal';

const LinkCopiedModal = (props: BaseModalProps): JSX.Element => {
  const tailwind = useTailwind();
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
      <View style={tailwind('p-6 w-32 h-32 justify-center items-center')}>
        <Link style={tailwind('mb-2')} size={40} color={getColor('text-neutral-100')} />
        <Text style={tailwind('text-center text-supporting-2 text-neutral-100')}>
          {strings.modals.link_copied_modal.message}
        </Text>
      </View>
    </CenterModal>
  );
};

export default LinkCopiedModal;
