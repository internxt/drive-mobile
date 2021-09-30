import React from 'react';
import { Text, View } from 'react-native'
import { tailwind } from '../../helpers/designSystem';
import EmptySharesImage from '../../../assets/images/screens/empty-shares.svg'

export default function EmptyShares(): JSX.Element {
  return <View style={tailwind('flex items-center opacity-50 h-full justify-center')}>
    <>
      <EmptySharesImage width={100} height={100} />
      <Text style={tailwind('text-base text-base-color font-bold m-5 mb-1')}>No shared items</Text>
      <Text style={tailwind('text-base text-base-color m-1')}>Your shared items will show up here</Text>
    </>
  </View>;
}