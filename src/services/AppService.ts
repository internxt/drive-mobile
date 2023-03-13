import { AppEnv } from '@internxt-mobile/types/app';
import Constants from 'expo-constants';
import { AppState, AppStateStatus } from 'react-native';
import EnvTest from '../../env/.env.test.json';
import packageJson from '../../package.json';
import { logger } from './common';
import deviceInfo from 'react-native-device-info';
import prettysize from 'prettysize';
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
    if (Constants.manifest?.extra) return Constants.manifest.extra as AppEnv;

    return Constants.manifest2?.extra as AppEnv;
  }

  public get urls() {
    return {
      termsAndConditions: 'https://internxt.com/legal',
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
}

const appService = new AppService();
export const constants = appService.constants;
export default appService;
