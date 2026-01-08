import { AppEnv } from '@internxt-mobile/types/app';
import { ExpoConfig } from 'expo/config';
import env from './env';
import packageJson from './package.json';
export enum AppStage {
  Development = 'development',
  Test = 'test',
  Staging = 'staging',
  Production = 'production',
}

const stage = AppStage.Production; // <- CHANGE STAGE

const packageVersion = packageJson.version.replace('v', '');
const RELEASE_ID = `${packageVersion} (${env[stage].APP_BUILD_NUMBER}) - ${stage}`;

const appConfig: ExpoConfig & { extra: AppEnv & { NODE_ENV: AppStage; RELEASE_ID: string } } = {
  name: 'Internxt',
  scheme: 'internxt',
  slug: 'drive-mobile',
  version: packageVersion,
  orientation: 'portrait',
  newArchEnabled: false, // Temporarily disabled due to: react-native-pdf (consider migrating to WebView)
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#091e42',
  },
  userInterfaceStyle: 'automatic',

  updates: {
    url: 'https://u.expo.dev/680f4feb-6315-4a50-93ec-36dcd0b831d2',
    fallbackToCacheTimeout: 0,
  },

  assetBundlePatterns: ['**/*'],
  runtimeVersion: packageVersion,
  ios: {
    jsEngine: 'hermes',
    icon: './assets/icon-ios.png',
    supportsTablet: true,
    bundleIdentifier: 'com.internxt.snacks',
    usesIcloudStorage: true,
    backgroundColor: '#FFFFFF',
    associatedDomains: ['webcredentials:www.internxt.com'],
    buildNumber: env[stage].IOS_BUILD_NUMBER.toString(),
    infoPlist: {
      UIDesignRequiresCompatibility: true,
      NSFaceIDUsageDescription: 'Protect the app access to secure the available files',
      NSCameraUsageDescription:
        'Allow $(PRODUCT_NAME) to access your camera to upload a newly captured photo to the storage service',
      NSPhotoLibraryAddUsageDescription: 'Allow $(PRODUCT_NAME) to save/download photos from the storage service',
      NSPhotoLibraryUsageDescription:
        'Allow $(PRODUCT_NAME) to access your photos to sync your device camera roll with our Photos cloud service',
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ['internxt', 'inxt'],
        },
      ],
    },
  },
  android: {
    jsEngine: 'hermes',
    versionCode: env[stage].ANDROID_VERSION_CODE,
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
            scheme: 'internxt',
          },
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
  extra: {
    eas: {
      projectId: '680f4feb-6315-4a50-93ec-36dcd0b831d2',
    },
    NODE_ENV: stage,
    RELEASE_ID,
    ...env[stage],
  },
  plugins: [
    'expo-font',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        android: {
          backgroundColor: '#091e42',
          image: './assets/images/splash.png',
          resizeMode: 'contain',
        },
      },
    ],
  ],
};

export default appConfig;
