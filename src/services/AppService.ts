import { AppEnv } from '@internxt-mobile/types/app';
import Constants from 'expo-constants';
import { AppState, AppStateStatus } from 'react-native';
import EnvTest from '../../env/.env.test.json';
import packageJson from '../../package.json';

export type AppStatus = AppStateStatus;
export type AppStateListener = (status: AppStatus) => void;
class AppService {
  private listeners: AppStateListener[] = [];
  public get name(): string {
    return packageJson.name;
  }

  public get version(): string {
    return packageJson.version;
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

  public get isDevMode() {
    return __DEV__;
  }
}

const appService = new AppService();
export const constants = appService.constants;
export default appService;
