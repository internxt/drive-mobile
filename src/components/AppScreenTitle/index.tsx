import { StyleProp, TextStyle, TouchableOpacity, View } from 'react-native';

import { CaretLeftIcon } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';

interface AppScreenTitleProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<TextStyle>;
  centerText?: boolean;
  showBackButton?: boolean;
  compactBackButton?: boolean;
  rightSlot?: JSX.Element;
  onBackButtonPressed?: () => void;
}

const defaultProps: Partial<AppScreenTitleProps> = {
  centerText: false,
  showBackButton: true,
};

const BACK_BUTTON_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const AppScreenTitle = ({
  text,
  textStyle,
  containerStyle,
  centerText = defaultProps.centerText,
  showBackButton = defaultProps.showBackButton,
  compactBackButton = false,
  rightSlot,
  onBackButtonPressed,
}: AppScreenTitleProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View
      style={[
        tailwind('flex-row justify-center items-center px-4'),
        {
          paddingTop: 22,
          paddingBottom: 14,
          backgroundColor: getColor('bg-surface'),
        },
        containerStyle,
      ]}
    >
      {showBackButton && (
        <TouchableOpacity
          style={compactBackButton ? tailwind('mr-2') : tailwind('flex-1')}
          hitSlop={compactBackButton ? BACK_BUTTON_HIT_SLOP : undefined}
          disabled={!onBackButtonPressed}
          onPress={onBackButtonPressed}
        >
          <View style={[tailwind('flex justify-center'), !onBackButtonPressed && tailwind('opacity-50')]}>
            <CaretLeftIcon weight="bold" color={getColor('text-primary')} size={24} />
          </View>
        </TouchableOpacity>
      )}

      <View pointerEvents="none" style={[tailwind('flex-row flex-grow'), centerText && tailwind('justify-center')]}>
        <AppText
          numberOfLines={1}
          medium
          style={[tailwind('text-2xl'), { color: getColor('text-gray-100') }, textStyle]}
        >
          {text}
        </AppText>
      </View>

      {rightSlot ? rightSlot : showBackButton && !compactBackButton && <View style={tailwind('flex-1')} />}
    </View>
  );
};

export default AppScreenTitle;
