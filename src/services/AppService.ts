import { AppEnv } from '@internxt-mobile/types/app';
import Constants from 'expo-constants';
import prettysize from 'prettysize';
import { AppState, AppStateStatus, Platform } from 'react-native';
import deviceInfo from 'react-native-device-info';
import EnvTest from '../../env/.env.test.json';
import packageJson from '../../package.json';
import { logger } from './common/logger';
export type AppStatus = AppStateStatus;
export type AppStateListener = (status: AppStatus) => void;
class AppService {
  private listeners: AppStateListener[] = [];
  public get name(): string {
    return packageJson.name;
  }

  public get version(): string {
    return packageJson.version.replace('v', '');
  }

  public get constants() {
    if (process.env.NODE_ENV === 'test') {
      return EnvTest as AppEnv;
    }
    if (Constants.expoConfig?.extra) return Constants.expoConfig.extra;
    if (Constants.manifest2?.extra) return Constants.manifest2.extra as AppEnv;

    return Constants.manifest2?.extra as AppEnv;
  }

  public get urls() {
    return {
      termsAndConditions: 'https://internxt.com/legal',
      webAuth: {
        login: `${this.constants.WEB_CLIENT_URL}/login?universalLink=true`,
        signup: `${this.constants.WEB_CLIENT_URL}/new?universalLink=true`,
      },
    };
  }

  public onAppStateChange(listener: AppStateListener) {
    const id = this.listeners.push(listener) - 1;

    return AppState.addEventListener('change', this.listeners[id]);
  }

  public removeListener() {
    // eslint-disable-next-line no-console
    console.error('Deprecated use .remove instead');
  }

  public async logAppInfo() {
    logger.info(`Running Internxt mobile v${this.version}`);
    logger.info(`Free device disk space: ${prettysize(await deviceInfo.getFreeDiskStorage())}`);
    logger.info(`Device is in airplane mode: ${await deviceInfo.isAirplaneMode()}`);
  }

  public get isDevMode() {
    return __DEV__;
  }

  public get isAndroid() {
    return Platform.OS === 'android';
  }

  public get isIOS() {
    return Platform.OS === 'ios';
  }
}

const appService = new AppService();
export const constants = appService.constants;
export default appService;
