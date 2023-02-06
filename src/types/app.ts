export interface AppEnv {
  DEBUG: boolean;
  APP_BUILD_NUMBER: number;
  IOS_BUILD_NUMBER: number;
  ANDROID_VERSION_CODE: number;
  SHOW_BILLING: boolean;
  CRYPTO_SECRET: string;
  WEB_CLIENT_URL: string;
  DRIVE_API_URL: string;
  DRIVE_NEW_API_URL: string;
  PAYMENTS_API_URL: string;
  BRIDGE_URL: string;
  PHOTOS_API_URL: string;
  SHARE_LINKS_URL: string;
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
  DATAPLANE_URL: string;
  ANALYTICS_WRITE_KEY: string;
  NOTIFICATIONS_URL: string;
}

export enum BiometricAccessType {
  FaceId = 'FaceId',
  FingerPrint = 'FingerPrint',
  TouchId = 'TouchId',
  Pin = 'Pin',
}
