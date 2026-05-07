import { NavigationContainer, NavigationContainerRefWithCurrent } from '@react-navigation/native';
import { useRef } from 'react';
import { View } from 'react-native';

import { RootStackParamList } from '../types/navigation';
import LinkingConfiguration from './LinkingConfiguration';
import RootNavigator from './RootNavigator';

interface NavigationProps {
  readonly navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
}

export default function Navigation({ navigationRef }: NavigationProps) {
  const routeNameRef = useRef<string>();

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          background: '#ffffff',
          border: '#ffffff',
          card: '#ffffff',
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
