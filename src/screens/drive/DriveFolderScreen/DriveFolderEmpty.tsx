import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';
import DriveFolderEmptyIcon from '../../../../assets/images/screens/empty-folder-open.svg';
import useGetColor from '../../../hooks/useColor';
export interface DriveFolderEmptyProps {
  title: string;
  message: string;
}

export const DriveFolderEmpty: React.FC<DriveFolderEmptyProps> = (props) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  return (
    <View style={tailwind('flex flex-col items-center')}>
      <DriveFolderEmptyIcon width={100} height={100} />
      <View style={tailwind('mt-5')}>
        <AppText
          medium
          style={[
            tailwind('text-xl text-center '),
            { lineHeight: getLineHeight(20, 1.2), color: getColor('text-gray-100') },
          ]}
        >
          {props.title}
        </AppText>
        <AppText
          style={[
            tailwind('text-center mt-1'),
            { lineHeight: getLineHeight(16, 1.2), color: getColor('text-gray-60') },
          ]}
        >
          {props.message}
        </AppText>
      </View>
    </View>
  );
};
