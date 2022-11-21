import { CaretLeft } from 'phosphor-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';

export interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export const BackButton: React.FC<BackButtonProps> = (props) => {
  const tailwind = useTailwind();
  const color = tailwind('text-primary').color as string;
  return (
    <View>
      <TouchableOpacity
        onPress={props.onPress}
        hitSlop={INCREASED_TOUCH_AREA}
        activeOpacity={0.7}
        style={tailwind('flex flex-row items-center')}
      >
        <CaretLeft weight="bold" size={26} color={color} />
        <AppText style={tailwind('text-primary')}>{props.label}</AppText>
      </TouchableOpacity>
    </View>
  );
};
