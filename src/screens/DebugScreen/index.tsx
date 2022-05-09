import React from 'react';
import { useNavigation } from '@react-navigation/native';

import strings from '../../../assets/lang/strings';
import { getColor, tailwind } from '../../helpers/designSystem';
import ScreenTitle from '../../components/AppScreenTitle';
import AppScreen from '../../components/AppScreen';
import DebugNotificationsWidget from '../../components/DebugNotificationsWidget';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DebugInternetWidget from '../../components/DebugInternetWidget';
import DebugUploadWidget from '../../components/DebugUploadWidget';
import DebugDownloadWidget from '../../components/DebugDownloadWidget';

function DebugScreen(): JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const onBackButtonPressed = () => navigation.goBack();

  return (
    <AppScreen safeAreaTop style={tailwind('h-full')} backgroundColor={getColor('neutral-20')}>
      <ScreenTitle
        textStyle={tailwind('text-2xl')}
        text={strings.screens.DebugScreen.title}
        centerText
        onBackButtonPressed={onBackButtonPressed}
      />

      <DebugInternetWidget />
      <DebugUploadWidget style={tailwind('mb-5')} />
      <DebugDownloadWidget style={tailwind('mb-5')} />
      <DebugNotificationsWidget />
    </AppScreen>
  );
}

export default DebugScreen;
