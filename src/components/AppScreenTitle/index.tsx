import { StyleProp, TextStyle, TouchableOpacity, View } from 'react-native';

import { CaretLeftIcon } from 'phosphor-react-native';
import useGetColor from '../../hooks/useColor';
import AppText from '../AppText';
import { cssInterop } from 'nativewind';

interface AppScreenTitleProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  textClassName?: string;
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
  const getColor = useGetColor();

  return (
    <View
      className="flex-row justify-center items-center px-4"
      style={[
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
          className={`${compactBackButton ? 'mr-2' : 'flex-1'}`}
          hitSlop={compactBackButton ? BACK_BUTTON_HIT_SLOP : undefined}
          disabled={!onBackButtonPressed}
          onPress={onBackButtonPressed}
        >
          <View className={`flex justify-center ${!onBackButtonPressed ? 'opacity-50' : ''}`}>
            <CaretLeftIcon weight="bold" color={getColor('text-primary')} size={24} />
          </View>
        </TouchableOpacity>
      )}

      <View pointerEvents="none" className={`flex-row flex-grow ${centerText ? 'justify-center' : ''}`}>
        <AppText
          numberOfLines={1}
          medium
          className="text-2xl"
          style={[{ color: getColor('text-gray-100') }, textStyle]}
        >
          {text}
        </AppText>
      </View>

      {rightSlot ? rightSlot : showBackButton && !compactBackButton && <View className="flex-1" />}
    </View>
  );
};

cssInterop(AppScreenTitle, { textClassName: 'textStyle' });

export default AppScreenTitle;
