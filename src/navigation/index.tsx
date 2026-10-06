import { DefaultTheme, NavigationContainer, NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useRef } from 'react';
import { View } from 'react-native';

import useGetColor from '../hooks/useColor';
import { RootStackParamList } from '../types/navigation';
import LinkingConfiguration from './LinkingConfiguration';
import RootNavigator from './RootNavigator';

interface NavigationProps {
  readonly navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
}

export default function Navigation({ navigationRef }: NavigationProps) {
  const routeNameRef = useRef<string>();
  const getColor = useGetColor();

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        dark: false,
        colors: {
          background: getColor('bg-surface'),
          border: '#ffffff',
          card: getColor('bg-surface'),
          notification: '#ffffff',
          primary: '#ffffff',
          text: '#ffffff',
        },
      }}
      ref={navigationRef}
      fallback={<View></View>}
      linking={LinkingConfiguration}
      onReady={() => {
        const currentRoute = navigationRef.getCurrentRoute();

        routeNameRef.current = currentRoute && currentRoute.name;
      }}
      onStateChange={() => {
        const currentRouteName = navigationRef.getCurrentRoute()?.name;

        routeNameRef.current = currentRouteName;
      }}
    >
      <RootNavigator navigationContainerRef={navigationRef} />
    </NavigationContainer>
  );
}
