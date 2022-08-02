import { ExpoConfig } from '@expo/config-types';
import env from './env';
import packageJson from './package.json';

export enum AppStage {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
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
  REACT_NATIVE_PAYMENTS_API_URL: string;
  REACT_NATIVE_BRIDGE_URL: string;
  REACT_NATIVE_PHOTOS_API_URL: string;
  REACT_NATIVE_PHOTOS_NETWORK_API_URL: string;
  REACT_NATIVE_SEGMENT_API: string;
  REACT_NATIVE_CRYPTO_SECRET2: string;
  REACT_NATIVE_MAGIC_IV: string;
  REACT_NATIVE_MAGIC_SALT: string;
  REACT_NATIVE_RECAPTCHA_V3: string;
  SENTRY_DSN: string;
  SENTRY_ORGANIZATION: string;
  SENTRY_PROJECT: string;
  SENTRY_URL: string;
  SENTRY_AUTH_TOKEN: string;
}

const stage = AppStage.Production; // <- CHANGE STAGE

const appConfig: ExpoConfig & { extra: AppEnv } = {
  name: 'Internxt',
  scheme: 'inxt',
  entryPoint: './index.js',
  slug: 'drive-mobile',
  version: packageJson.version,
  orientation: 'portrait',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#091e42',
  },
  updates: {
    url: 'https://exp.host/@internxt/drive-mobile',
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    icon: './assets/icon-ios.png',
    supportsTablet: true,
    bundleIdentifier: 'com.internxt.snacks',
    usesIcloudStorage: true,
    backgroundColor: '#FFFFFF',
    infoPlist: {
      NSCameraUsageDescription:
        'Allow $(PRODUCT_NAME) to access your camera to upload a newly captured photo to the storage service',
      NSPhotoLibraryAddUsageDescription: 'Allow $(PRODUCT_NAME) to save/download photos from the storage service',
      NSPhotoLibraryUsageDescription:
        'Allow $(PRODUCT_NAME) to access your photos to sync your device camera roll with our Photos cloud service',
    },
    googleServicesFile: './GoogleService-Info.plist',
  },
  android: {
    googleServicesFile: './google-services.json',
    versionCode: 56,
    icon: './assets/icon-android.png',
    adaptiveIcon: {
      foregroundImage: './assets/icon-android.png',
      backgroundColor: '#091e42',
    },
    package: 'com.internxt.cloud',
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          {
            mimeType: '*/*',
          },
        ],
      },
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
    barStyle: 'light-content',
    backgroundColor: '#091e42',
  },
  androidNavigationBar: {
    barStyle: 'dark-content',
    backgroundColor: '#091e42',
  },
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: env[stage].SENTRY_ORGANIZATION,
          project: env[stage].SENTRY_PROJECT,
          authToken: env[stage].SENTRY_AUTH_TOKEN,
          url: env[stage].SENTRY_URL,
        },
      },
    ],
  },
  extra: { NODE_ENV: stage, ...env[stage] },
};

export default appConfig;
