import { XIcon } from 'phosphor-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { fontStyles, useShareColors } from '../theme';

interface DriveHeaderProps {
  onClose: () => void;
  onSave: () => void;
  saveEnabled: boolean;
  isSaveLoading?: boolean;
}

export const DriveHeader = ({ onClose, onSave, saveEnabled, isSaveLoading }: DriveHeaderProps) => {
  const tailwind = useTailwind();
  const colors = useShareColors();

  return (
    <View
      style={[
        tailwind('flex-row items-center justify-between px-4 pt-3 pb-3'),
        { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.gray10, position: 'relative' },
      ]}
    >
      <TouchableOpacity style={[tailwind('h-10 items-start justify-center'), { zIndex: 1 }]} onPress={onClose} hitSlop={8}>
        <XIcon size={22} color={colors.gray60} />
      </TouchableOpacity>

      <Text
        style={[
          tailwind('text-center text-base'),
          fontStyles.semibold,
          { color: colors.gray100, position: 'absolute', left: 0, right: 0, paddingHorizontal: 96, pointerEvents: 'none', zIndex: 0 },
        ]}
        numberOfLines={1}
      >
        {strings.screens.ShareExtension.title}
      </Text>

      <TouchableOpacity
        style={[
          tailwind('rounded-lg h-10 px-3 items-center justify-center'),
          { backgroundColor: saveEnabled ? colors.primary : colors.primaryDisabled, minWidth: 76, zIndex: 1 },
        ]}
        onPress={saveEnabled ? onSave : undefined}
        hitSlop={8}
      >
        <Text style={[tailwind('text-sm text-center'), fontStyles.semibold, { color: colors.white }, isSaveLoading && { opacity: 0 }]}>
          {strings.buttons.save}
        </Text>
        {isSaveLoading && <ActivityIndicator size="small" color={colors.white} style={{ position: 'absolute' }} />}
      </TouchableOpacity>
    </View>
  );
};
