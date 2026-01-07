import React from 'react';
import { View } from 'react-native';

import { ArrowDown } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import useGetColor from '../../../hooks/useColor';
import { DriveItemData, FocusedItem as DriveItemFocused } from '../../../types/drive/item';
import AppButton from '../../AppButton';
import AppText from '../../AppText';
import CenterModal from '../CenterModal';

interface ConfirmMoveItemModalProps {
  isOpen: boolean;
  isMovingItem: boolean;
  move: {
    destination: { name: string };
    origin: { name: string };
  };
  items: (DriveItemData | DriveItemFocused)[];
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmMoveItemModal: React.FC<ConfirmMoveItemModalProps> = (props) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <CenterModal
      isOpen={props.isOpen}
      onClosed={() => {
        props.onClose();
      }}
    >
      <View style={[tailwind('p-5 rounded-lg '), { backgroundColor: getColor('bg-gray-5') }]}>
        <AppText style={[tailwind('text-sm'), { color: getColor('text-gray-60') }]}>
          {strings.formatString(strings.modals.ConfirmMoveItemModal.title, props.items.length)}
        </AppText>
        <View style={tailwind('flex flex-col')}>
          <View>
            <AppText semibold style={[tailwind('text-xl'), { color: getColor('text-gray-100') }]}>
              {props.move.origin?.name}
            </AppText>
          </View>
          <View style={tailwind('my-2')}>
            <ArrowDown weight="bold" color={getColor('text-gray-80')} size={16} />
          </View>
          <View>
            <AppText semibold style={[tailwind('text-xl'), { color: getColor('text-gray-100') }]}>
              {props.move.destination?.name}
            </AppText>
            <AppText style={[tailwind('text-sm mt-0'), { color: getColor('text-gray-60') }]}>
              {strings.modals.ConfirmMoveItemModal.destination}
            </AppText>
          </View>
        </View>
        <View style={tailwind('flex flex-row mt-5')}>
          <View style={tailwind('flex-1 mr-2')}>
            <AppButton
              type="cancel"
              title={strings.buttons.cancel}
              onPress={props.onClose}
              disabled={props.isMovingItem}
            />
          </View>
          <View style={tailwind('flex-1 ml-2')}>
            <AppButton
              type="accept"
              title={strings.buttons.move}
              onPress={props.onConfirm}
              loading={props.isMovingItem}
            />
          </View>
        </View>
      </View>
    </CenterModal>
  );
};

export default ConfirmMoveItemModal;
