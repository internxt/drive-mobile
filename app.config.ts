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
  DEBUG: boolean;
  APP_BUILD_NUMBER: number;
  SHOW_BILLING: boolean;
  CRYPTO_SECRET: string;
  WEB_CLIENT_URL: string;
  DRIVE_API_URL: string;
  DRIVE_NEW_API_URL: string;
  PAYMENTS_API_URL: string;
  BRIDGE_URL: string;
  PHOTOS_API_URL: string;
  PHOTOS_NETWORK_API_URL: string;
  CRYPTO_SECRET2: string;
  MAGIC_IV: string;
  MAGIC_SALT: string;
  RECAPTCHA_V3: string;
  SENTRY_DSN: string;
  SENTRY_ORGANIZATION: string;
  SENTRY_PROJECT: string;
  SENTRY_URL: string;
  SENTRY_AUTH_TOKEN: string;
  RELEASE_ID: string;
  DATAPLANE_URL: string;
  ANALYTICS_WRITE_KEY: string;
}

const stage = AppStage.Production; // <- CHANGE STAGE

const RELEASE_ID = `${packageJson.version} (${env[stage].APP_BUILD_NUMBER})`;

const appConfig: ExpoConfig & { extra: AppEnv } = {
  name: 'Internxt',
  scheme: 'inxt',
  entryPoint: './index.js',
  slug: 'drive-mobile',
  version: packageJson.version,
  orientation: 'portrait',
  jsEngine: 'hermes',
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
  },
  android: {
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
          release: RELEASE_ID,
        },
      },
    ],
  },
  extra: { NODE_ENV: stage, RELEASE_ID, ...env[stage] },
};

export default appConfig;
