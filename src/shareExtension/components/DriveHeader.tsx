import { XIcon } from 'phosphor-react-native';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../assets/lang/strings';
import { colors, fontStyles } from '../theme';

interface DriveHeaderProps {
  onClose: () => void;
  onSave: () => void;
  saveEnabled: boolean;
  isSaveLoading?: boolean;
}

export const DriveHeader = ({ onClose, onSave, saveEnabled, isSaveLoading }: DriveHeaderProps) => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('flex-row items-center px-4 pt-3 pb-3 border-b border-gray-10')}>
      <TouchableOpacity
        style={[tailwind('h-10 items-start justify-center'), { width: 76 }]}
        onPress={onClose}
        hitSlop={8}
      >
        <XIcon size={22} color={colors.gray60} />
      </TouchableOpacity>

      <Text
        style={[tailwind('flex-1 text-center text-base text-gray-100 px-2'), fontStyles.semibold]}
        numberOfLines={1}
      >
        {strings.screens.ShareExtension.title}
      </Text>

      <TouchableOpacity
        style={[
          tailwind('rounded-lg h-10 px-3 py-1.5 items-center justify-center'),
          saveEnabled ? tailwind('bg-primary') : { backgroundColor: colors.primaryDisabled },
          { width: 76 },
        ]}
        onPress={saveEnabled ? onSave : undefined}
        hitSlop={8}
      >
        <Text style={[tailwind('text-sm text-white'), fontStyles.semibold, isSaveLoading && { opacity: 0 }]}>
          {strings.buttons.save}
        </Text>
        {isSaveLoading && <ActivityIndicator size="small" color="white" style={{ position: 'absolute' }} />}
      </TouchableOpacity>
    </View>
  );
};
