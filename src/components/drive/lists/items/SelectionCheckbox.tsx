import { CheckIcon, MinusIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import useGetColor from '../../../../hooks/useColor';

export const SQUARE_CHECKBOX_SIZE = 20;
const SQUARE_BORDER_RADIUS = 4;
const SQUARE_CHECK_SIZE = 14;
const CIRCLE_SIZE = 24;
const CIRCLE_CHECK_SIZE = 14;
const BORDER_WIDTH = 1.5;

interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  shape: 'square' | 'circle';
}

export const SelectionCheckbox = ({ checked, indeterminate = false, shape }: SelectionCheckboxProps): JSX.Element => {
  const getColor = useGetColor();
  const isCircle = shape === 'circle';
  const size = isCircle ? CIRCLE_SIZE : SQUARE_CHECKBOX_SIZE;
  const uncheckedBorderColor = isCircle ? getColor('text-white') : getColor('border-gray-30');
  const isFilled = checked || indeterminate;
  const markSize = isCircle ? CIRCLE_CHECK_SIZE : SQUARE_CHECK_SIZE;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: isCircle ? size / 2 : SQUARE_BORDER_RADIUS,
        borderWidth: BORDER_WIDTH,
        borderColor: isFilled && !isCircle ? getColor('text-primary') : uncheckedBorderColor,
        backgroundColor: isFilled ? getColor('text-primary') : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <CheckIcon weight="bold" size={markSize} color={getColor('text-white')} />}
      {!checked && indeterminate && <MinusIcon weight="bold" size={markSize} color={getColor('text-white')} />}
    </View>
  );
};
