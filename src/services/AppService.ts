import Constants from 'expo-constants';
import { AppState, AppStateStatus } from 'react-native';
import { AppEnv } from '../../app.config';

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
    return Constants.manifest?.extra as AppEnv;
  }

  public onAppStateChange(listener: AppStateListener) {
    const id = this.listeners.push(listener) - 1;
    AppState.addEventListener('change', this.listeners[id]);

    return id;
  }

  public removeListener(id: number) {
    AppState.removeEventListener('change', this.listeners[id]);
  }
}

const appService = new AppService();
export const constants = appService.constants;
export default appService;
