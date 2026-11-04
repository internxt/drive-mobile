import { XIcon } from 'phosphor-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import useGetColor from '../../../hooks/useColor';
import globalStyle from '../../../styles/global';
import { initialOf } from './avatarInitial';
import { composeFieldTextStyle } from './composeFieldStyles';

const CHIP_HEIGHT = 28;
const CHIP_LEADING_PADDING = 4;
const INITIAL_SIZE = 20;
const INITIAL_FONT_SIZE = 11;
const REMOVE_ICON_SIZE = 14;
const REMOVE_BUTTON_LEADING_PADDING = 6;
const REMOVE_BUTTON_TRAILING_PADDING = 8;
const REMOVE_BUTTON_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 6 };

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
        tailwind('flex-row items-center rounded-full mr-1.5 mb-1'),
        {
          paddingLeft: CHIP_LEADING_PADDING,
          height: CHIP_HEIGHT,
          maxWidth: '100%',
          backgroundColor: getColor('bg-primary-10'),
        },
      ]}
    >
      <View
        style={[
          tailwind('items-center justify-center rounded-full mr-1.5'),
          { width: INITIAL_SIZE, height: INITIAL_SIZE, backgroundColor: getColor('text-primary') },
        ]}
      >
        <Text style={[globalStyle.fontWeight.semibold, { fontSize: INITIAL_FONT_SIZE, color: getColor('text-white') }]}>
          {initialOf(undefined, address)}
        </Text>
      </View>
      <Text numberOfLines={1} style={[composeFieldTextStyle, { flexShrink: 1, color: getColor('text-primary-dark') }]}>
        {address}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={address}
        onPress={onRemove}
        hitSlop={REMOVE_BUTTON_HIT_SLOP}
        style={[
          tailwind('items-center justify-center'),
          {
            height: CHIP_HEIGHT,
            paddingLeft: REMOVE_BUTTON_LEADING_PADDING,
            paddingRight: REMOVE_BUTTON_TRAILING_PADDING,
          },
        ]}
      >
        <XIcon size={REMOVE_ICON_SIZE} weight="bold" color={getColor('text-primary-dark')} />
      </TouchableOpacity>
    </View>
  );
};
