import React, { useState } from 'react';
import { View, ViewStyle } from 'react-native';
import Pdf from 'react-native-pdf';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from 'src/components/AppText';

export interface DrivePdfPreviewProps {
  source: string;
  width: number;
  height: number;
  onTap: () => void;
  style: ViewStyle;
  topbarVisible: boolean;
}

export const DrivePdfPreview: React.FC<DrivePdfPreviewProps> = (props) => {
  const insets = useSafeAreaInsets();
  const [pages, setPages] = useState<{ currentPage: number; totalPages: number }>();
  return (
    <View className="flex-1">
      {pages ? (
        <View
          className="absolute rounded-full px-4 py-2 right-2.5  top-2.5 z-10"
          style={{ backgroundColor: 'rgba(44, 44, 48, 0.75)', marginTop: props.topbarVisible ? 0 : insets.top }}
        >
          <AppText className="text-white">
            {pages.currentPage} of {pages.totalPages}
          </AppText>
        </View>
      ) : null}
      <Pdf
        source={{ uri: props.source }}
        onPageSingleTap={props.onTap}
        onPageChanged={(page, numberOfPages) => {
          setPages({ currentPage: page, totalPages: numberOfPages });
        }}
        style={[{ height: props.height, width: props.width, backgroundColor: '#fff' }]}
      />
    </View>
  );
};
