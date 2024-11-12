import { DotsThree, X } from 'phosphor-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import AppText from 'src/components/AppText';
import { INCREASED_TOUCH_AREA } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import SwipeBackHandler from '../../../components/SwipeBackHandler';

export interface DrivePreviewScreenHeaderProps {
  onCloseButtonPress: () => void;
  onActionsButtonPress: () => void;
  title: string;
  subtitle: string;
}
export const DRIVE_PREVIEW_HEADER_HEIGHT = 64;
export const DrivePreviewScreenHeader: React.FC<DrivePreviewScreenHeaderProps> = (props) => {
  const tailwind = useTailwind();
  return (
    <View
      style={[
        tailwind('border-b border-gray-10 flex flex-row items-center px-4 justify-between'),
        { height: DRIVE_PREVIEW_HEADER_HEIGHT },
      ]}
    >
      <SwipeBackHandler swipeBack={props.onCloseButtonPress} />
      <TouchableOpacity hitSlop={INCREASED_TOUCH_AREA} onPress={props.onCloseButtonPress}>
        <X size={28} color={tailwind('text-gray-100').color as string} />
      </TouchableOpacity>
      <View style={tailwind('flex-1 px-4')}>
        <AppText
          ellipsizeMode="middle"
          medium
          numberOfLines={1}
          style={[tailwind('text-center text-gray-100'), { lineHeight: 16 }]}
        >
          {props.title}
        </AppText>
        <AppText style={[tailwind('text-center text-sm text-gray-60 mt-0'), { lineHeight: 16 }]}>
          {props.subtitle}
        </AppText>
      </View>
      <TouchableOpacity hitSlop={INCREASED_TOUCH_AREA} onPress={props.onActionsButtonPress}>
        <DotsThree size={28} color={tailwind('text-gray-100').color as string} />
      </TouchableOpacity>
    </View>
  );
};
