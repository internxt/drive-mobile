import React from 'react';
import { Text, View } from 'react-native';
import { tailwind } from '../../helpers/designSystem';
import EmptyRecentsImage from '../../../assets/images/screens/empty-recents.svg';

export default function EmptyRecents(): JSX.Element {
  return (
    <View style={tailwind('flex items-center opacity-50 h-full justify-center')}>
      <>
        <EmptyRecentsImage width={100} height={100} />
        <Text style={tailwind('text-base text-base-color font-bold m-5 mb-1')}>No recent files</Text>
        <Text style={tailwind('text-base text-base-color m-1')}>Try interacting with your files</Text>
      </>
    </View>
  );
}
