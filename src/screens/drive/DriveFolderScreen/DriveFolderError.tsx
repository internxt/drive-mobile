import { WifiSlash } from 'phosphor-react-native';
import React from 'react';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { getLineHeight } from 'src/styles/global';

export interface DriveFolderErrorProps {
  error: { title: string; message: string };
  tryAgainLabel: string;
  onTryAgain: () => void;
}

export const DriveFolderError: React.FC<DriveFolderErrorProps> = (props) => {
  return (
    <View className="flex flex-col items-center">
      <View>
        <WifiSlash size={64} />
      </View>
      <View className="mt-5 flex items-center justify-center">
        <AppText className="text-gray-100 text-xl text-center" style={{ lineHeight: getLineHeight(20, 1.1) }} medium>
          {props.error.title}
        </AppText>
        <AppText className="text-gray-60 mt-2 text-center" style={{ lineHeight: getLineHeight(16, 1.2) }}>
          {props.error.message}
        </AppText>
      </View>
      <View className="mt-5">
        <AppButton title={props.tryAgainLabel} type={'white'} onPress={props.onTryAgain} />
      </View>
    </View>
  );
};
