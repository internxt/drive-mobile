import React from 'react';
import { Text, View, TouchableOpacity, StyleProp, TextStyle } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';
import { useAppSelector } from '../../store/hooks';

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
    <View style={[tailwind('flex-row justify-center items-center py-2 px-5'), containerStyle]}>
      {showBackButton && (
        <TouchableOpacity style={tailwind('w-6')} disabled={!backButtonEnabled} onPress={onBackButtonPressed}>
          <View style={[tailwind('flex justify-center items-center'), !onBackButtonPressed && tailwind('opacity-50')]}>
            <Unicons.UilAngleLeft color={getColor('blue-60')} size={32} />
          </View>
        </TouchableOpacity>
      )}

      <View style={[tailwind('flex-row flex-grow'), centerText && tailwind('justify-center')]}>
        <Text
          numberOfLines={1}
          style={[tailwind('text-neutral-700 text-3xl'), globalStyle.fontWeight.medium, textStyle]}
        >
          {text}
        </Text>
      </View>

      {showBackButton && <View style={tailwind('w-6')} />}
    </View>
  );
};

export default ScreenTitle;
