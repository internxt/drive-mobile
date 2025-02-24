import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import InternxtLogo from '../../../assets/logo.svg';
import appService from '../../services/AppService';
import AppText from '../AppText';

interface AppVersionWidgetProps {
  style?: StyleProp<ViewStyle>;
  displayLogo?: boolean;
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
      {props.displayLogo ? (
        <View style={tailwind('flex items-center justify-center mb-0.5')}>
          <InternxtLogo height={10} />
        </View>
      ) : null}
      <AppText style={[tailwind('text-center text-xs text-gray-50')]}>
        v{appService.version} ({appService.constants.APP_BUILD_NUMBER})
      </AppText>
    </View>
  );
}

export default AppVersionWidget;
