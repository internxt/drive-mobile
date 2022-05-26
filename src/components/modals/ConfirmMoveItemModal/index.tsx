import React from 'react';
import { View } from 'react-native';

import strings from '../../../../assets/lang/strings';
import { tailwind } from '../../../helpers/designSystem';
import AppText from '../../AppText';
import CenterModal from '../CenterModal';
import { DriveItemData, DriveItemFocused } from '../../../types/drive';
import { ArrowDown } from 'phosphor-react-native';
import AppButton from '../../AppButton';

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
  return (
    <CenterModal
      isOpen={props.isOpen}
      onClosed={() => {
        props.onClose();
      }}
    >
      <View style={tailwind('p-5')}>
        <AppText style={tailwind('text-sm text-gray-60')}>
          {strings.formatString(strings.modals.ConfirmMoveItemModal.title, props.items.length)}
        </AppText>
        <View style={tailwind('flex flex-col')}>
          <View>
            <AppText semibold style={tailwind('text-xl text-gray-80')}>
              {props.move.origin?.name}
            </AppText>
          </View>
          <View style={tailwind('my-2')}>
            <ArrowDown weight="bold" style={tailwind('text-gray-80')} size={16} />
          </View>
          <View>
            <AppText semibold style={tailwind('text-xl text-gray-80')}>
              {props.move.destination?.name}
            </AppText>
            <AppText style={tailwind('text-gray-60 text-sm mt-0')}>
              {strings.modals.ConfirmMoveItemModal.destination}
            </AppText>
          </View>
        </View>
        <View style={tailwind('flex flex-row mt-5')}>
          <View style={tailwind('flex-1 mr-2')}>
            <AppButton
              type="cancel"
              title={strings.components.buttons.cancel}
              onPress={props.onClose}
              disabled={props.isMovingItem}
            />
          </View>
          <View style={tailwind('flex-1 ml-2')}>
            <AppButton
              type="accept"
              title={strings.components.buttons.move}
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
