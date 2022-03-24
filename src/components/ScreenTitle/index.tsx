import React from 'react';
import { Text, View, TouchableOpacity, StyleProp, TextStyle } from 'react-native';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles';
import { useAppSelector } from '../../store/hooks';
import { CaretLeft } from 'phosphor-react-native';

interface ScreenTitleProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<TextStyle>;
  centerText?: boolean;
  showBackButton?: boolean;
  onBackButtonPressed?: () => void;
}

const defaultProps: Partial<ScreenTitleProps> = {
  centerText: false,
  showBackButton: true,
};

const ScreenTitle = ({
  text,
  textStyle,
  containerStyle,
  centerText = defaultProps.centerText,
  showBackButton = defaultProps.showBackButton,
  onBackButtonPressed,
}: ScreenTitleProps): JSX.Element => {
  const backButtonEnabled = useAppSelector((state) => state.layout.backButtonEnabled);

  return (
    <View style={[tailwind('pt-4 flex-row justify-center items-center py-2 px-5'), containerStyle]}>
      {showBackButton && (
        <TouchableOpacity style={tailwind('flex-1')} disabled={!backButtonEnabled} onPress={onBackButtonPressed}>
          <View style={[tailwind('flex justify-center'), !onBackButtonPressed && tailwind('opacity-50')]}>
            <CaretLeft color={getColor('blue-60')} size={24} />
          </View>
        </TouchableOpacity>
      )}

      <View pointerEvents="none" style={[tailwind('flex-row flex-grow'), centerText && tailwind('justify-center')]}>
        <Text
          numberOfLines={1}
          style={[tailwind('text-neutral-700 text-3xl'), globalStyle.fontWeight.medium, textStyle]}
        >
          {text}
        </Text>
      </View>

      {showBackButton && <View style={tailwind('flex-1')} />}
    </View>
  );
};

export default ScreenTitle;
