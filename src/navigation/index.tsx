import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useRef } from 'react';
import { View } from 'react-native';

import LinkingConfiguration from './LinkingConfiguration';
import RootNavigator from './RootNavigator';

export default function Navigation() {
  const navigationRef = useNavigationContainerRef();
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
      <RootNavigator />
    </NavigationContainer>
  );
}
