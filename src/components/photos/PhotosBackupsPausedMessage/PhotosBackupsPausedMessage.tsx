import strings from 'assets/lang/strings';
import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import Wifi from 'assets/icons/wifi.svg';
import BatteryFull from 'assets/icons/battery-full.svg';
export const PhotosBackupsPausedMessage: React.FC = () => {
  const tailwind = useTailwind();

  return (
    <View style={tailwind('bg-gray-5 p-5 rounded-xl')}>
      <View style={tailwind('flex justify-center flex-row items-center')}>
        <BatteryFull />
        <AppText style={tailwind('mx-1')}>+</AppText>
        <Wifi />
      </View>
      <AppText semibold style={tailwind('text-gray-100 text-center')}>
        {strings.screens.gallery.backupsPaused.title}
      </AppText>
      <AppText
        style={[
          tailwind('text-sm text-center'),
          { lineHeight: getLineHeight(tailwind('text-sm').fontSize as number, 1.2) },
        ]}
      >
        {strings.screens.gallery.backupsPaused.message}
      </AppText>
    </View>
  );
};
