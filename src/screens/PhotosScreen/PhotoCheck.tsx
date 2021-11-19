import React from 'react';
import { View } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { tailwind } from '../../helpers/designSystem';

function PhotoCheck({ isChecked = false }: { isChecked: boolean }): JSX.Element {
  const styleChecked = tailwind('absolute bg-blue-60 z-10 rounded-3xl bottom-2 border border-white right-2');
  const styleUnchecked = tailwind('absolute bg-white z-10 rounded-3xl bottom-2 border border-blue-60 right-2');

  return (
    <View style={isChecked ? styleChecked : styleUnchecked}>
      <Unicons.UilCheck size={20} color="white" />
    </View>
  );
}

export default PhotoCheck;
