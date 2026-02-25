import Portal from '@burstware/react-native-portal';
import strings from 'assets/lang/strings';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../CenterModal';

export type NameCollisionAction = 'replace' | 'keep-both';

export interface NameCollisionModalProps {
  isOpen: boolean;
  itemName: string;
  collisionCount: number;
  itemType: 'file' | 'folder';
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (action: NameCollisionAction) => void;
}

const NameCollisionModal: React.FC<NameCollisionModalProps> = ({
  isOpen,
  itemName,
  collisionCount,
  itemType,
  confirmLabel,
  onClose,
  onConfirm,
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [selectedAction, setSelectedAction] = useState<NameCollisionAction>('replace');

  const isMultiple = collisionCount > 1;

  const title = isMultiple ? strings.modals.nameCollision.titleMultiple : strings.modals.nameCollision.title;

  const message = isMultiple
    ? strings.modals.nameCollision.messageMultiple
    : itemType === 'folder'
      ? (strings.formatString(strings.modals.nameCollision.messageSingleFolder, itemName) as string)
      : (strings.formatString(strings.modals.nameCollision.messageSingleFolder, itemName) as string);

  const replaceLabel = isMultiple
    ? strings.modals.nameCollision.replaceAll
    : strings.modals.nameCollision.replaceCurrentItem;

  const keepLabel = isMultiple ? strings.modals.nameCollision.keepAll : strings.modals.nameCollision.keepBoth;

  const handleConfirm = () => {
    onConfirm(selectedAction);
  };

  return (
    <Portal>
      <CenterModal isOpen={isOpen} onClosed={onClose}>
        <View style={[tailwind('px-4 py-4'), { backgroundColor: getColor('bg-surface') }]}>
          <AppText medium style={[tailwind('text-xl mb-2'), { color: getColor('text-gray-100') }]}>
            {title}
          </AppText>

          <AppText
            style={[
              tailwind('mb-5'),
              {
                color: getColor('text-gray-60'),
                lineHeight: (tailwind('text-base').fontSize as number) * 1.4,
              },
            ]}
          >
            {message}
          </AppText>

          <RadioOption
            label={replaceLabel}
            selected={selectedAction === 'replace'}
            onPress={() => setSelectedAction('replace')}
          />

          <View style={tailwind('mt-3')}>
            <RadioOption
              label={keepLabel}
              selected={selectedAction === 'keep-both'}
              onPress={() => setSelectedAction('keep-both')}
            />
          </View>

          <View style={tailwind('flex-row mt-6')}>
            <AppButton title={strings.buttons.cancel} type="cancel" onPress={onClose} style={tailwind('flex-1')} />
            <View style={tailwind('w-3')} />
            <AppButton title={confirmLabel} type="accept" onPress={handleConfirm} style={tailwind('flex-1')} />
          </View>
        </View>
      </CenterModal>
    </Portal>
  );
};

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const RadioOption: React.FC<RadioOptionProps> = ({ label, selected, onPress }) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <Pressable onPress={onPress} style={tailwind('flex-row items-center')}>
      <View
        style={[
          tailwind('rounded-full items-center justify-center'),
          {
            width: 20,
            height: 20,
            borderWidth: selected ? 6 : 1.5,
            borderColor: selected ? getColor('text-primary') : getColor('border-gray-30'),
          },
        ]}
      />
      <AppText style={[tailwind('ml-3 text-base'), { color: getColor('text-gray-100') }]}>{label}</AppText>
    </Pressable>
  );
};

export default NameCollisionModal;
