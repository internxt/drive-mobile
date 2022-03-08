import { ExpoConfig } from '@expo/config-types';

const appConfig: ExpoConfig = {
  name: 'Internxt',
  scheme: 'inxt',
  entryPoint: './index.js',
  slug: 'drive-mobile',
  version: '1.5.7',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#FFFFFF',
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.internxt.snacks',
    usesIcloudStorage: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#091e42',
    },
    package: 'com.internxt.cloud',
    intentFilters: [
      {
        action: 'VIEW',
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          {
            scheme: 'inxt',
          },
        ],
      },
    ],
  },
  androidStatusBar: {
    barStyle: 'dark-content',
    backgroundColor: '#FFFFFF',
  },
  androidNavigationBar: {
    barStyle: 'light-content',
    backgroundColor: '#FFFFFF',
  },
};

export default appConfig;
