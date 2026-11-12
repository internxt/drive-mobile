import Portal from '@burstware/react-native-portal';
import strings from 'assets/lang/strings';
import React from 'react';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import CenterModal from '../CenterModal';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'confirm' | 'confirm-danger';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = (props) => {
  const getColor = useGetColor();

  return (
    <Portal>
      <CenterModal isOpen={props.isOpen} onClosed={props.onClose}>
        <View className="px-4 py-4 rounded-xl overflow-hidden">
          <AppText medium className="text-xl" style={{ color: getColor('text-gray-100') }}>
            {props.title}
          </AppText>
          <AppText className="mb-6 mt-2" lineHeight={1.2} style={{ color: getColor('text-gray-60') }}>
            {props.message}
          </AppText>
          <View className="flex-row justify-center">
            <AppButton title={strings.buttons.cancel} type="cancel" onPress={props.onCancel} className="flex-1" />
            <View className="w-3" />
            <AppButton
              title={props.confirmLabel}
              type={props.type === 'confirm-danger' ? 'delete' : 'accept'}
              onPress={props.onConfirm}
              className="flex-1"
            />
          </View>
        </View>
      </CenterModal>
    </Portal>
  );
};
