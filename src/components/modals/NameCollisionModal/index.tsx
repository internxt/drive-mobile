import Portal from '@burstware/react-native-portal';
import strings from 'assets/lang/strings';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { SelectionCheckbox } from 'src/components/drive/lists/items/SelectionCheckbox';
import useGetColor from 'src/hooks/useColor';
import { useTailwind } from 'tailwind-rn';
import CenterModal from '../CenterModal';

export type NameCollisionAction = 'replace' | 'keep-both';
type NameCollisionOption = NameCollisionAction | 'skip';

export interface NameCollisionModalProps {
  isOpen: boolean;
  itemName: string;
  collisionCount: number;
  itemType: 'file' | 'folder';
  confirmLabel: string;
  showApplyToAll?: boolean;
  onClose: () => void;
  onConfirm: (action: NameCollisionAction, shouldApplyToAll: boolean) => void;
  onSkip?: (shouldApplyToAll: boolean) => void;
}

const NameCollisionModal: React.FC<NameCollisionModalProps> = ({
  isOpen,
  itemName,
  collisionCount,
  itemType,
  confirmLabel,
  showApplyToAll = false,
  onClose,
  onConfirm,
  onSkip,
}) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const [selectedAction, setSelectedAction] = useState<NameCollisionOption>('replace');
  const [isApplyToAllChecked, setIsApplyToAllChecked] = useState(false);

  const isMultiple = collisionCount > 1;

  const title = isMultiple ? strings.modals.nameCollision.titleMultiple : strings.modals.nameCollision.title;

  const singleMessageKey = itemType === 'folder' ? 'messageSingleFolder' : 'messageSingleFile';
  const singleMessageTemplate = onSkip
    ? strings.modals.nameCollision.messageSingleItemWithSkip
    : strings.modals.nameCollision[singleMessageKey];
  const message = isMultiple
    ? strings.modals.nameCollision.messageMultiple
    : (strings.formatString(singleMessageTemplate, itemName) as string);

  const replaceLabel = isMultiple
    ? strings.modals.nameCollision.replaceAll
    : strings.modals.nameCollision.replaceCurrentItem;

  const keepLabel = isMultiple ? strings.modals.nameCollision.keepAll : strings.modals.nameCollision.keepBoth;

  const handleConfirm = () => {
    if (selectedAction === 'skip') {
      onSkip?.(isApplyToAllChecked);
      return;
    }
    onConfirm(selectedAction, isApplyToAllChecked);
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

          {onSkip ? (
            <View style={tailwind('mt-3')}>
              <RadioOption
                label={strings.modals.nameCollision.skipItem}
                selected={selectedAction === 'skip'}
                onPress={() => setSelectedAction('skip')}
              />
            </View>
          ) : null}

          {showApplyToAll ? (
            <Pressable
              onPress={() => setIsApplyToAllChecked((isChecked) => !isChecked)}
              style={tailwind('flex-row items-center mt-5')}
            >
              <SelectionCheckbox checked={isApplyToAllChecked} shape="square" />
              <AppText style={[tailwind('ml-3 text-base'), { color: getColor('text-gray-100') }]}>
                {strings.modals.nameCollision.applyToAll}
              </AppText>
            </Pressable>
          ) : null}

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
