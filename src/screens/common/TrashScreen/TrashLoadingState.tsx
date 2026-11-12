import { DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import _ from 'lodash';
import React from 'react';
import { View } from 'react-native';
import DriveItemSkinSkeleton from 'src/components/DriveItemSkinSkeleton';

export const TrashLoadingState: React.FC = () => {
  return (
    <View className="h-full">
      {_.times(20, (n) => (
        <View className="h-16" key={n}>
          <DriveItemSkinSkeleton viewMode={DriveListViewMode.List} />
        </View>
      ))}
    </View>
  );
};
