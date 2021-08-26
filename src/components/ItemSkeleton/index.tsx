import React from 'react';
import { View, ScrollView } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

export default function ItemSkeleton(props): JSX.Element {

  return <View><ScrollView>
    {Array.from({ length: 10 }).map((_, index) => {
      return <SkeletonPlaceholder key={index}>
        <SkeletonPlaceholder.Item flexDirection="row" paddingLeft={20} paddingTop={20}>
          <SkeletonPlaceholder.Item width={30} height={30} borderRadius={50}/>
          <SkeletonPlaceholder.Item marginLeft={20} flexGrow={1} flexDirection={'column'}>
            <SkeletonPlaceholder.Item width='90%' height={20} borderRadius={4} marginBottom={2}/>
            <SkeletonPlaceholder.Item width='70%' height={20} borderRadius={4} marginTop={3}/>
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    })
    }
  </ScrollView>
  </View>
}