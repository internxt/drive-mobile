import React from 'react';
import { Text, View } from 'react-native'
import { tailwind } from '../../helpers/designSystem';

export function EmptyFolder(): JSX.Element {
  return <View style={tailwind('flex justify-center border text-center')}>
    <Text>Holi</Text>
  </View>;
}