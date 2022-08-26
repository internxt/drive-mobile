import React from 'react';

import strings from '../../../assets/lang/strings';
import ScreenTitle from '../../components/AppScreenTitle';
import AppScreen from '../../components/AppScreen';
import DebugNotificationsWidget from '../../components/DebugNotificationsWidget';
import DebugInternetWidget from '../../components/DebugInternetWidget';
import DebugUploadWidget from '../../components/DebugUploadWidget';
import DebugDownloadWidget from '../../components/DebugDownloadWidget';
import { RootStackScreenProps } from '../../types/navigation';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../hooks/useColor';
import DebugPhotosWidget from '../../components/DebugPhotosWidget';
import { DebugDeviceStorageWidget } from 'src/components/DebugDeviceStorageWidget';
import { ScrollView } from 'react-native';

function DebugScreen({ navigation }: RootStackScreenProps<'Debug'>): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const onBackButtonPressed = () => navigation.goBack();

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')} backgroundColor={getColor('text-neutral-20')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.DebugScreen.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      <ScrollView style={tailwind('flex-1')}>
        <DebugInternetWidget />
        <DebugUploadWidget style={tailwind('mb-5')} />
        <DebugDownloadWidget style={tailwind('mb-5')} />
        <DebugNotificationsWidget style={tailwind('mb-5')} />
        <DebugPhotosWidget style={tailwind('mb-5')} />
        <DebugDeviceStorageWidget style={tailwind('mb-16')} />
      </ScrollView>
    </AppScreen>
  );
}

export default DebugScreen;
