import React from 'react';
import { View, TouchableOpacity, StyleProp, TextStyle } from 'react-native';

import { useAppSelector } from '../../store/hooks';
import { CaretLeft } from 'phosphor-react-native';
import AppText from '../AppText';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';

interface AppScreenTitleProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<TextStyle>;
  centerText?: boolean;
  showBackButton?: boolean;
  rightSlot?: JSX.Element;
  onBackButtonPressed?: () => void;
}

const defaultProps: Partial<AppScreenTitleProps> = {
  centerText: false,
  showBackButton: true,
};

const AppScreenTitle = ({
  text,
  textStyle,
  containerStyle,
  centerText = defaultProps.centerText,
  showBackButton = defaultProps.showBackButton,
  rightSlot,
  onBackButtonPressed,
}: AppScreenTitleProps): JSX.Element => {
  const tailwind = useTailwind();
  const getColor = useGetColor();

  return (
    <View style={[tailwind('flex-row justify-center items-center pt-6 pb-4 px-5'), containerStyle]}>
      {showBackButton && (
        <TouchableOpacity style={tailwind('flex-1')} disabled={!onBackButtonPressed} onPress={onBackButtonPressed}>
          <View style={[tailwind('flex justify-center'), !onBackButtonPressed && tailwind('opacity-50')]}>
            <CaretLeft weight="bold" color={getColor('text-blue-60')} size={24} />
          </View>
        </TouchableOpacity>
      )}

      <View pointerEvents="none" style={[tailwind('flex-row flex-grow'), centerText && tailwind('justify-center')]}>
        <AppText numberOfLines={1} medium style={[tailwind('text-neutral-700 text-2xl'), textStyle]}>
          {text}
        </AppText>

        {rightSlot}
      </View>

      {showBackButton && <View style={tailwind('flex-1')} />}
    </View>
  );
};

export default AppScreenTitle;
