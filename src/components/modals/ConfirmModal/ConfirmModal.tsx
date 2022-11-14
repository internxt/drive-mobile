import Portal from '@burstware/react-native-portal';
import strings from 'assets/lang/strings';
import React from 'react';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';
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
  const tailwind = useTailwind();
  return (
    <Portal>
      <CenterModal isOpen={props.isOpen} onClosed={props.onClose}>
        <View style={tailwind('px-4 py-4')}>
          <AppText medium style={tailwind('text-xl text-gray-80')}>
            {props.title}
          </AppText>
          <AppText
            style={[
              tailwind('text-gray-60 mb-6 mt-2'),
              { lineHeight: (tailwind('text-base').fontSize as number) * 1.2 },
            ]}
          >
            {props.message}
          </AppText>
          <View style={tailwind('flex-row justify-center')}>
            <AppButton
              title={strings.buttons.cancel}
              type="cancel"
              onPress={props.onCancel}
              style={tailwind('flex-1')}
            />
            <View style={tailwind('w-3')} />
            <AppButton
              title={props.confirmLabel}
              type={props.type === 'confirm-danger' ? 'delete' : 'accept'}
              onPress={props.onConfirm}
              style={tailwind('flex-1')}
            />
          </View>
        </View>
      </CenterModal>
    </Portal>
  );
};
