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
    <View className="flex-1 mr-2">
      <TouchableOpacity
        onPress={props.onPress}
        hitSlop={INCREASED_TOUCH_AREA}
        activeOpacity={0.7}
        className="flex flex-row items-center"
      >
        <CaretLeft size={iconSize} color={color} />
        <AppText className="text-primary" ellipsizeMode="tail" numberOfLines={1}>
          {props.label}
        </AppText>
      </TouchableOpacity>
    </View>
  );
};
