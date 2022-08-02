import React, { useState, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import * as Updates from 'expo-updates';

import packageJson from '../../../package.json';
import appService from '../../services/AppService';
import AppText from '../AppText';
import { useTailwind } from 'tailwind-rn';

interface AppVersionWidgetProps {
  style?: StyleProp<ViewStyle>;
}

function AppVersionWidget(props: AppVersionWidgetProps): JSX.Element {
  const tailwind = useTailwind();
  const [, setDebugText] = useState('');

  useEffect(() => {
    appService.constants.NODE_ENV === 'production' &&
      Updates.checkForUpdateAsync()
        .then(() => undefined)
        .catch(() => undefined);

    Updates.addListener((updateInfo) => {
      setDebugText(JSON.stringify(updateInfo));
    });
  }, []);

  return (
    <View style={props.style}>
      <AppText style={tailwind('text-center text-sm text-gray-40')}>
        v{packageJson.version} ({appService.constants.REACT_NATIVE_APP_BUILD_NUMBER})
      </AppText>
    </View>
  );
}

export default AppVersionWidget;
