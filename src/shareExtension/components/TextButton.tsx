import { StyleProp, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, fontStyles } from '../theme';

interface TextButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TextButton = ({ title, onPress, disabled, style }: TextButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} className="py-2" style={style}>
      <Text
        className="text-base text-primary"
        style={[fontStyles.medium, disabled && { color: colors.primaryDisabled }]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};
