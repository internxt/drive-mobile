import { useState } from 'react';
import { Modal, Pressable, Text, TouchableHighlight, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../theme';
import { NameCollisionAction } from '../types';

interface ShareNameCollisionModalProps {
  visible: boolean;
  itemNameWithoutExtension: string;
  collisionedFilesCounter: number;
  onConfirm: (action: NameCollisionAction) => void;
  onCancel: () => void;
}

export const ShareNameCollisionModal = ({
  visible,
  itemNameWithoutExtension,
  collisionedFilesCounter,
  onConfirm,
  onCancel,
}: ShareNameCollisionModalProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();
  const [selectedAction, setSelectedAction] = useState<NameCollisionAction>('replace');

  const isMultiple = collisionedFilesCounter > 1;
  const nameCollisionTexts = strings.modals.nameCollision;

  const title = isMultiple ? nameCollisionTexts.titleMultiple : nameCollisionTexts.title;
  const message = isMultiple
    ? nameCollisionTexts.messageMultiple
    : (strings.formatString(nameCollisionTexts.messageSingleFile, itemNameWithoutExtension) as string);
  const replaceLabel = isMultiple ? nameCollisionTexts.replaceAll : nameCollisionTexts.replaceCurrentItem;
  const keepLabel = isMultiple ? nameCollisionTexts.keepAll : nameCollisionTexts.keepBoth;

  const handleConfirm = () => onConfirm(selectedAction);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[tailwind('flex-1 items-center justify-center px-5'), { backgroundColor: 'rgba(0,0,0,0.4)' }]}
        onPress={onCancel}
      >
        <Pressable style={[tailwind('w-full rounded-xl p-4'), { backgroundColor: colors.surface }]}>
          <Text style={[tailwind('text-xl mb-2'), fontStyles.semibold, { color: colors.gray100 }]}>{title}</Text>
          <Text style={[tailwind('text-base mb-5'), { lineHeight: 22, color: colors.gray60 }]}>{message}</Text>

          <RadioOption
            label={replaceLabel}
            selected={selectedAction === 'replace'}
            onPress={() => setSelectedAction('replace')}
            colors={colors}
          />
          <View style={tailwind('mt-3')}>
            <RadioOption
              label={keepLabel}
              selected={selectedAction === 'keep-both'}
              onPress={() => setSelectedAction('keep-both')}
              colors={colors}
            />
          </View>

          <View style={[tailwind('flex-row mt-6'), { gap: 12 }]}>
            <TouchableHighlight
              style={[
                tailwind('flex-1 rounded-lg px-4 py-3 items-center justify-center border'),
                { backgroundColor: colors.surface, borderColor: colors.gray10 },
              ]}
              underlayColor={colors.gray10}
              onPress={onCancel}
            >
              <Text style={[tailwind('text-base'), { color: colors.gray80 }]}>{strings.buttons.cancel}</Text>
            </TouchableHighlight>

            <TouchableHighlight
              style={[
                tailwind('flex-1 rounded-lg px-4 py-3 items-center justify-center'),
                { backgroundColor: colors.primary },
              ]}
              underlayColor="rgb(0, 88, 219)"
              onPress={handleConfirm}
            >
              <Text style={[tailwind('text-base'), fontStyles.semibold, { color: colors.white }]}>{strings.buttons.upload}</Text>
            </TouchableHighlight>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useShareColors>;
}

const RadioOption = ({ label, selected, onPress, colors }: RadioOptionProps) => {
  const tailwind = useTailwind();
  return (
    <Pressable onPress={onPress} style={tailwind('flex-row items-center')}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: selected ? 6 : 1.5,
          borderColor: selected ? colors.primary : colors.gray20,
        }}
      />
      <Text style={[tailwind('ml-3 text-base'), { color: colors.gray100 }]}>{label}</Text>
    </Pressable>
  );
};
