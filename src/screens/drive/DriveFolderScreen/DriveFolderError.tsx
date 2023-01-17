import { WifiSlash } from 'phosphor-react-native';
import React from 'react';
import { View } from 'react-native';
import AppButton from 'src/components/AppButton';
import AppText from 'src/components/AppText';
import { getLineHeight } from 'src/styles/global';
import { useTailwind } from 'tailwind-rn';

export interface DriveFolderErrorProps {
  error: { title: string; message: string };
  tryAgainLabel: string;
  onTryAgain: () => void;
}

export const DriveFolderError: React.FC<DriveFolderErrorProps> = (props) => {
  const tailwind = useTailwind();
  return (
    <View style={tailwind('flex flex-col items-center')}>
      <View>
        <WifiSlash size={64} />
      </View>
      <View style={tailwind('mt-5 flex items-center justify-center')}>
        <AppText style={[tailwind('text-gray-100 text-xl text-center'), { lineHeight: getLineHeight(20, 1.1) }]} medium>
          {props.error.title}
        </AppText>
        <AppText style={[tailwind('text-gray-60 mt-2 text-center'), { lineHeight: getLineHeight(16, 1.2) }]}>
          {props.error.message}
        </AppText>
      </View>
      <View style={tailwind('mt-5')}>
        <AppButton title={props.tryAgainLabel} type={'white'} onPress={props.onTryAgain} />
      </View>
    </View>
  );
};
