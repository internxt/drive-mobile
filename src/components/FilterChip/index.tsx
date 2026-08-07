import { Icon as ChipIcon } from 'phosphor-react-native';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import AppText from 'src/components/AppText';
import useGetColor from 'src/hooks/useColor';

interface FilterChipProps {
  label?: string;
  icon?: ChipIcon;
  trailingIcon?: ChipIcon;
  labelMaxWidth?: number;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onIconPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ICON_SIZE = 18;
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const FilterChip = ({
  label,
  icon: Icon,
  trailingIcon: TrailingIcon,
  labelMaxWidth,
  active,
  disabled,
  onPress,
  onIconPress,
  style,
  testID,
}: FilterChipProps): JSX.Element => {
  const getColor = useGetColor();

  const backgroundColor = getColor(active ? 'bg-primary-20' : 'bg-primary-10');
  const textColor = getColor('text-primary');
  const iconColor = active ? getColor('text-primary-dark') : textColor;

  if (!label) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[styles.iconOnly, { backgroundColor, opacity: disabled ? 0.5 : 1 }, style]}
        hitSlop={HIT_SLOP}
        testID={testID}
      >
        {Icon && <Icon size={ICON_SIZE} color={iconColor} />}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.withLabel, { backgroundColor, opacity: disabled ? 0.5 : 1 }, style]} testID={testID}>
      {Icon && (
        <TouchableOpacity onPress={onIconPress ?? onPress} disabled={disabled} hitSlop={HIT_SLOP}>
          <Icon size={ICON_SIZE} color={iconColor} />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onPress} disabled={disabled || !onPress} style={styles.labelRow} hitSlop={HIT_SLOP}>
        <AppText
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.label, { color: textColor }, labelMaxWidth ? { maxWidth: labelMaxWidth } : null]}
        >
          {label}
        </AppText>
        {TrailingIcon && <TrailingIcon size={ICON_SIZE} color={iconColor} />}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  iconOnly: {
    width: 32,
    height: 32,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withLabel: {
    height: 32,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
});

export default FilterChip;
