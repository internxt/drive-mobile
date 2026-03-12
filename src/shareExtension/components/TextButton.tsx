import { StyleProp, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { colors, fontStyles } from '../theme';

interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TextButton = ({ title, onPress, disabled, style }: TextButtonProps) => {
  const tailwind = useTailwind();
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[tailwind('py-2'), style]}>
      <Text
        style={[
          tailwind('text-base text-primary'),
          fontStyles.medium,
          disabled && { color: colors.primaryDisabled },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
