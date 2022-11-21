import { DriveListViewMode } from '@internxt-mobile/types/drive';
import _ from 'lodash';
import React from 'react';
import { View } from 'react-native';
import DriveItemSkinSkeleton from 'src/components/DriveItemSkinSkeleton';
import { useTailwind } from 'tailwind-rn';

export const TrashLoadingState: React.FC = () => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind('h-full')}>
      {_.times(20, (n) => (
        <View style={tailwind('h-16')} key={n}>
          <DriveItemSkinSkeleton viewMode={DriveListViewMode.List} />
        </View>
      ))}
    </View>
  );
};
