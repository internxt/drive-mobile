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
  const iconSize = 26;
  return (
    <View style={tailwind('flex-1')}>
      <TouchableOpacity
        onPress={props.onPress}
        hitSlop={INCREASED_TOUCH_AREA}
        activeOpacity={0.7}
        style={tailwind('flex flex-row items-center')}
      >
        <CaretLeft size={iconSize} color={color} />
        <AppText style={tailwind('text-primary')} ellipsizeMode="tail" numberOfLines={1}>
          {props.label}
        </AppText>
      </TouchableOpacity>
    </View>
  );
};
