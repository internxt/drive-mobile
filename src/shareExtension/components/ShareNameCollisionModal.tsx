import { useState } from 'react';
import { Modal, Pressable, Text, TouchableHighlight, View } from 'react-native';
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
        className="flex-1 items-center justify-center px-5"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onCancel}
      >
        <Pressable className="w-full rounded-xl p-4" style={{ backgroundColor: colors.surface }}>
          <Text className="text-xl mb-2" style={[fontStyles.semibold, { color: colors.gray100 }]}>
            {title}
          </Text>
          <Text className="text-base mb-5" style={{ lineHeight: 22, color: colors.gray60 }}>
            {message}
          </Text>

          <RadioOption
            label={replaceLabel}
            selected={selectedAction === 'replace'}
            onPress={() => setSelectedAction('replace')}
            colors={colors}
          />
          <View className="mt-3">
            <RadioOption
              label={keepLabel}
              selected={selectedAction === 'keep-both'}
              onPress={() => setSelectedAction('keep-both')}
              colors={colors}
            />
          </View>

          <View className="flex-row mt-6" style={{ gap: 12 }}>
            <TouchableHighlight
              className="flex-1 rounded-lg px-4 py-3 items-center justify-center border"
              style={{ backgroundColor: colors.surface, borderColor: colors.gray10 }}
              underlayColor={colors.gray10}
              onPress={onCancel}
            >
              <Text className="text-base" style={{ color: colors.gray80 }}>
                {strings.buttons.cancel}
              </Text>
            </TouchableHighlight>

            <TouchableHighlight
              className="flex-1 rounded-lg px-4 py-3 items-center justify-center"
              style={{ backgroundColor: colors.primary }}
              underlayColor="rgb(0, 88, 219)"
              onPress={handleConfirm}
            >
              <Text className="text-base" style={[fontStyles.semibold, { color: colors.white }]}>
                {strings.buttons.upload}
              </Text>
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
  return (
    <Pressable onPress={onPress} className="flex-row items-center">
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: selected ? 6 : 1.5,
          borderColor: selected ? colors.primary : colors.gray20,
        }}
      />
      <Text className="ml-3 text-base" style={{ color: colors.gray100 }}>
        {label}
      </Text>
    </Pressable>
  );
};
