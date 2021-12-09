import React from 'react';
import { Button, View } from 'react-native';
import { NavigationStackProp } from 'react-navigation-stack';
import { tailwind } from '../../../helpers/designSystem';

import { PhotosScreen } from '../../../types';

function PhotosPermissionsScreen({ navigation }: { navigation: NavigationStackProp }): JSX.Element {
  const onButtonPressed = () => {
    navigation.replace(PhotosScreen.Gallery);
  };

  return (
    <View style={tailwind('app-screen bg-white flex-1 justify-center px-5')}>
      <Button title="Start syncing my photos" onPress={onButtonPressed}></Button>
    </View>
  );
}

export default PhotosPermissionsScreen;
