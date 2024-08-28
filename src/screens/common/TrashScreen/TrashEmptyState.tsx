import strings from 'assets/lang/strings';
import { Trash } from 'phosphor-react-native';
import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';

export const TrashEmptyState: React.FC = () => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind('flex-1 items-center justify-center px-8')}>
      <View style={tailwind('mb-5')}>
        <Trash weight="thin" color={tailwind('text-gray-100').color as string} size={64} />
      </View>
      <AppText medium style={tailwind('text-lg text-gray-80 text-center')}>
        {strings.screens.TrashScreen.empty.title}
      </AppText>
      <AppText style={tailwind('text-gray-40 text-center leading-5 mt-1')}>
        {strings.screens.TrashScreen.empty.hint}
      </AppText>
    </View>
  );
};
