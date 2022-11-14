import strings from 'assets/lang/strings';
import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import { useTailwind } from 'tailwind-rn';

export const TrashEmptyState: React.FC = () => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind('flex-1 items-center justify-center px-8')}>
      <AppText medium style={tailwind('text-lg text-gray-80 text-center')}>
        {strings.screens.TrashScreen.empty.title}
      </AppText>
      <AppText style={tailwind('text-gray-40 text-center leading-5 mt-1')}>
        {strings.screens.TrashScreen.empty.hint}
      </AppText>
    </View>
  );
};
