import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import * as Unicons from '@iconscout/react-native-unicons';

import { getColor, tailwind } from '../../helpers/designSystem';
import globalStyle from '../../styles/global.style';
import { Reducers } from '../../store/reducers/reducers';

interface ScreenTitleProps {
  text: string;
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
  centerText = defaultProps.centerText,
  showBackButton = defaultProps.showBackButton,
  onBackButtonPressed,
}: ScreenTitleProps) => {
  const backButtonEnabled = useSelector((state: Reducers) => state.layoutState.backButtonEnabled);

  return (
    <View style={tailwind('flex-row justify-center items-center px-5')}>
      {showBackButton && (
        <TouchableOpacity style={tailwind('w-6')} disabled={!backButtonEnabled} onPress={onBackButtonPressed}>
          <View style={[tailwind('flex justify-center items-center'), tailwind(!onBackButtonPressed && 'opacity-50')]}>
            <Unicons.UilAngleLeft color={getColor('blue-60')} size={32} />
          </View>
        </TouchableOpacity>
      )}

      <View style={[tailwind('flex-row my-2 flex-grow'), centerText && tailwind('justify-center')]}>
        <Text numberOfLines={1} style={[tailwind('text-neutral-700 text-3xl'), globalStyle.fontWeight.medium]}>
          {text}
        </Text>
      </View>

      {showBackButton && <View style={tailwind('w-6')} />}
    </View>
  );
};

export default ScreenTitle;
