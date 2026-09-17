import { XIcon } from 'phosphor-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../../../hooks/useColor';
import { composeFieldTextStyle } from './composeFieldStyles';

type RecipientChipProps = {
  address: string;
  onRemove: () => void;
};

/**
 * A recipient already added to a field, with the control that takes it out again.
 *
 * @param props.address - Address the chip stands for.
 * @param props.onRemove - Called when the user removes the chip.
 */
export const RecipientChip = ({ address, onRemove }: RecipientChipProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View
      style={[
        tailwind('flex-row items-center rounded-full px-2.5 py-1 mr-1.5 mb-1'),
        { maxWidth: '100%', backgroundColor: getColor('bg-gray-5') },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[composeFieldTextStyle, tailwind('mr-2'), { flexShrink: 1, color: getColor('text-gray-80') }]}
      >
        {address}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={address}
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <XIcon size={14} color={getColor('text-gray-50')} />
      </TouchableOpacity>
    </View>
  );
};
