import { ExpoConfig } from '@expo/config-types';
import env from './env';

export enum AppStage {
  Development = 'development',
  Production = 'production',
}

export interface AppEnv {
  NODE_ENV: AppStage;
  REACT_NATIVE_DEBUG: boolean;
  REACT_NATIVE_APP_BUILD_NUMBER: number;
  REACT_NATIVE_SHOW_BILLING: boolean;
  REACT_NATIVE_CRYPTO_SECRET: string;
  REACT_NATIVE_WEB_CLIENT_URL: string;
  REACT_NATIVE_DRIVE_API_URL: string;
  REACT_NATIVE_BRIDGE_URL: string;
  REACT_NATIVE_PHOTOS_API_URL: string;
  REACT_NATIVE_PHOTOS_NETWORK_API_URL: string;
  REACT_NATIVE_SEGMENT_API: string;
  REACT_NATIVE_CRYPTO_SECRET2: string;
  REACT_NATIVE_MAGIC_IV: string;
  REACT_NATIVE_MAGIC_SALT: string;
  REACT_NATIVE_RECAPTCHA_V3: string;
}

const stage = AppStage.Production; // <- CHANGE STAGE

const appConfig: ExpoConfig & { extra: AppEnv } = {
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
    backgroundColor: '#FFFFFF',
  },
  android: {
    splash: {
      backgroundColor: '#FFFFFF',
    },
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
    barStyle: 'dark-content',
    backgroundColor: '#FFFFFF',
    visible: 'sticky-immersive',
  },
  extra: { NODE_ENV: stage, ...env[stage] },
};

export default appConfig;
