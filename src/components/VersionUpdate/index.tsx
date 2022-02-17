import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import * as Updates from 'expo-updates';

import PackageJson from '../../../package.json';
import { tailwind } from '../../helpers/designSystem';

function VersionUpdate(): JSX.Element {
  const [, setDebugText] = useState('');

  useEffect(() => {
    Updates.checkForUpdateAsync()
      .then(() => undefined)
      .catch(() => undefined);

    Updates.addListener((updateInfo) => {
      setDebugText(JSON.stringify(updateInfo));
    });
  }, []);

  return (
    <View>
      <Text style={tailwind('text-center text-base text-sm text-gray-50')}>
        Internxt Drive v{PackageJson.version} (2)
      </Text>
    </View>
  );
}

export default VersionUpdate;
