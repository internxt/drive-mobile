import Constants from 'expo-constants';
import { AppEnv } from '../../app.config';

import packageJson from '../../package.json';

class AppService {
  public get name(): string {
    return packageJson.name;
  }

  public get version(): string {
    return packageJson.version;
  }

  public get constants() {
    return Constants.manifest?.extra as AppEnv;
  }
}

const appService = new AppService();
export const constants = appService.constants;
export default appService;
